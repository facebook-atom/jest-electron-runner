/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import crypto from 'crypto';
import Docblock from '@jest-runner/core/docblock';
import fs from 'fs';
import globLib from 'glob';
import j from 'jscodeshift';
import path from 'path';
import prettier from 'prettier';

const DEFAULT_RPC_PROCESS_PATH = '@jest-runner/rpc/RPCProcess';

type GenerateOptions = {|
  globs: Array<string>,
  RPCProcessPath?: string,
|};

export const generate = async (options: GenerateOptions) => {
  const files = await prepareFiles(options);
  files.forEach(([filePath, source]) => {
    fs.writeFileSync(filePath, source);
    // eslint-disable-next-line no-console
    console.log(`write: ${filePath}`);
  });
};

export const prepareFiles = async ({
  globs,
  RPCProcessPath = DEFAULT_RPC_PROCESS_PATH,
}: GenerateOptions) => {
  const files = globs.reduce(
    (files, glob) => files.concat(globLib.sync(glob)),
    [],
  );
  return Promise.all(
    files.map(async file => {
      // eslint-disable-next-line no-console
      console.log(`generating: ${file}`);
      if (!file.match(/\.js$/)) {
        throw new Error(
          `RPC definitions must be '.js' files. filename: ${file}`,
        );
      }
      const source = fs.readFileSync(file, 'utf8');
      const ast = j.withParser('flow')(source);
      const moduleExports = ast
        .find(j.AssignmentExpression, {
          left: {
            type: 'MemberExpression',
            property: {type: 'Identifier', name: 'exports'},
            object: {type: 'Identifier', name: 'module'},
          },
        })
        .nodes();

      validateExports(moduleExports);

      const propNames = moduleExports[0].right.properties.map(
        prop => prop.key.name,
      );

      const {fileName, className} = makeGeneratedFilename(file);
      return [
        fileName,
        await codeGen({
          file,
          generatedFile: fileName,
          propNames,
          className,
          RPCProcessPath,
        }),
      ];
    }),
  );
};

const makeGeneratedFilename = filePath => {
  const basename = path.basename(filePath, '.js');
  const dirname = path.dirname(filePath);
  const fileName = path.join(dirname, `${basename}Process.generated.js`);
  const className = `${basename}Process`;
  return {fileName, className};
};

const codeGen = async ({
  propNames,
  file,
  generatedFile,
  RPCProcessPath,
  className,
}) => {
  const lines = [
    '/**',
    ' * ****************************************************',
    ' * THIS IS A GENERATED FILE. DO NOT MODIFY IT MANUALLY!',
    ' * ****************************************************',
    ' */',
    '',
    `import typeof Methods from '${relativePath(generatedFile, file)}'`,
    `import RPCProcess from '${
      RPCProcessPath === DEFAULT_RPC_PROCESS_PATH
        ? RPCProcessPath
        : relativePath(generatedFile, RPCProcessPath)
    }';`,
    '',
  ];

  lines.push('');
  lines.push(`class ${className} extends RPCProcess<Methods> {`);
  lines.push('  initializeRemote(): Methods {');
  lines.push('    return {');
  for (const propName of propNames) {
    lines.push(
      `      '${propName}': (this.jsonRPCCall.bind(this, '${propName}'): any),`,
    );
  }
  lines.push('    };');
  lines.push('  };');
  lines.push('}');
  lines.push(`module.exports = ${className};`);

  const code = await prettify(generatedFile, lines.join('\n'));
  const docblock = new Docblock(code);

  const signed = crypto
    .createHash('md5')
    .update(docblock.getCode())
    .digest('hex');

  docblock.setDirective('flow');
  docblock.setDirective('generated', signed);

  return docblock.printFileContent();
};

const validateExports = nodes => {
  if (!nodes.length) {
    throw new Error(
      `RPC definition file should have a "module.exports = " assignment`,
    );
  }

  const exported = nodes[0].right;

  if (exported.type !== 'ObjectExpression') {
    throw new Error(`RPC definition file must export an object`);
  }

  const properties = exported.properties;

  const errorMessages = properties.reduce((errors, property) => {
    if (!property.method) {
      errors.push(`
      RPC definition must export an object where properties can only be methods.

      property: ${JSON.stringify(property.key)}

      e.g.:
        module.exports = {
          test(a: number): Promise<number> {
              return Promise.resolve(1)
          }
        }
        `);
    }

    if (!property.value.returnType) {
      errors.push(`
      RPC definition properties must have return value type annotation.

      property: ${JSON.stringify(property.key)}
      `);
    }

    if (
      !(
        property.value.returnType.typeAnnotation.id.type === 'Identifier' &&
        property.value.returnType.typeAnnotation.id.name === 'Promise'
      )
    ) {
      errors.push(`
        RPC definition properties must have a return type of Promise.

        property: ${JSON.stringify(property.key)}
        `);
    }
    return errors;
  }, []);

  if (errorMessages.length) {
    throw new Error(errorMessages.join('\n'));
  }
};

const relativePath = (from, to) => {
  let rel = path.relative(path.dirname(from), to);
  if (!rel.match(/^\./)) {
    rel = './' + rel;
  }

  return rel;
};

const prettify = async (generatedFile, code) => {
  const config: any = await prettier.resolveConfig(generatedFile);
  return prettier.format(code, config);
};
