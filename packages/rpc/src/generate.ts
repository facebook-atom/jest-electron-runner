/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import crypto from 'crypto';
import fs from 'fs';
import globLib from 'glob';
import j from 'jscodeshift';
import path from 'path';
import prettier from 'prettier';

// @ts-ignore until module is typed
import Docblock from '@jest-runner/core/build/docblock';

const DEFAULT_RPC_PROCESS_PATH = '@jest-runner/rpc';

type GenerateOptions = {
  globs: string[],
  RPCProcessPath?: string,
};

export const generate = async (options: GenerateOptions) => {
  const files = await prepareFiles(options);

  files.forEach(([filePath, source]) => {
    fs.writeFileSync(filePath, source);
    console.log(`write: ${filePath}`);
  });
};

export const prepareFiles = async ({
  globs,
  RPCProcessPath = DEFAULT_RPC_PROCESS_PATH,
}: GenerateOptions) => {
  const files = globs.reduce(
    (files: string[], glob) => files.concat(globLib.sync(glob)),
    [],
  );
  return Promise.all(
    files.map(async (file: string) => {
      console.log(`generating: ${file}`);

      const {isJsFile, isTsFile} = getFileType(file);

      if (!isJsFile && !isTsFile) {
        throw new Error(
          `RPC definitions must be '.js or .ts' files. filename: ${file}`,
        );
      }

      const source = fs.readFileSync(file, 'utf8');

      // the flow parser can also handle ts files
      const ast = j.withParser('flow')(source);
      const moduleExports = isJsFile
        ? ast
            .find(j.AssignmentExpression, {
              left: {
                type: 'MemberExpression',
                property: {type: 'Identifier', name: 'exports'},
                object: {type: 'Identifier', name: 'module'},
              },
            })
            .nodes()
        : ast.find(j.ExportDefaultDeclaration).nodes();

      validateExports(moduleExports, isJsFile);

      const exportDeclaration =
        moduleExports[0].right || moduleExports[0].declaration;

      const propNames = exportDeclaration.properties.map(
        (prop: any) => prop.key.name,
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

const makeGeneratedFilename = (filePath: string) => {
  const ext = path.extname(filePath);
  const basename = path.basename(filePath, ext);
  const dirname = path.dirname(filePath);
  const fileName = path.join(dirname, `${basename}Process.generated${ext}`);
  const className = `${basename}Process`;
  return {fileName, className};
};

const getFileType = (file: string) => ({
  isJsFile: /\.js$/.test(file),
  isTsFile: /\.ts$/.test(file),
});

const codeGen = async ({
  propNames,
  file,
  generatedFile,
  RPCProcessPath,
  className,
}: {
  propNames: any,
  file: any,
  generatedFile: any,
  RPCProcessPath: any,
  className: any,
}) => {
  const {isJsFile} = getFileType(file);
  const exportDeclaration = isJsFile ? 'module.exports =' : 'export default';

  const lines = [
    '/**',
    ' * ****************************************************',
    ' * THIS IS A GENERATED FILE. DO NOT MODIFY IT MANUALLY!',
    ' * ****************************************************',
    ' */',
    '',
    `${
      isJsFile
        ? `import typeof Methods from '${relativePath(generatedFile, file)}'`
        : ''
    }`,
    isJsFile ? '' : '// @ts-ignore until module is typed',
    `import {RPCProcess} from '${
      RPCProcessPath === DEFAULT_RPC_PROCESS_PATH
        ? RPCProcessPath
        : relativePath(generatedFile, RPCProcessPath)
    }';`,
    '',
    isJsFile ? '' : 'type Methods = any',
    '',
  ];

  lines.push('');
  lines.push(`class ${className} extends RPCProcess<Methods> {`);
  if (!isJsFile) lines.push('jsonRPCCall: any');
  lines.push('  initializeRemote(): Methods {');
  lines.push('    return {');
  for (const propName of propNames) {
    lines.push(
      isJsFile
        ? `      '${propName}': (this.jsonRPCCall.bind(this, '${propName}'): any),`
        : `      '${propName}': this.jsonRPCCall.bind(this, '${propName}'),`,
    );
  }
  lines.push('    };');
  lines.push('  };');
  lines.push('}');
  lines.push(`${exportDeclaration} ${className};`);

  const code = await prettify(generatedFile, lines.join('\n'));
  const docblock = new Docblock(code);

  const signed = crypto
    .createHash('md5')
    .update(docblock.getCode())
    .digest('hex');

  if (isJsFile) docblock.setDirective('flow');
  docblock.setDirective('generated', signed);

  return docblock.printFileContent();
};

const validateExports = (nodes: any[], isJsFile = true) => {
  const exportAssignment = isJsFile ? 'module.exports =' : 'export default';

  if (!nodes.length) {
    throw new Error(
      `RPC definition file should have ${
        isJsFile ? 'a' : 'an'
      } "${exportAssignment}" assignment`,
    );
  }

  const exported = nodes[0].right || nodes[0].declaration;

  if (exported.type !== 'ObjectExpression') {
    throw new Error(`RPC definition file must export an object`);
  }

  const properties = exported.properties;

  const errorMessages = properties.reduce((errors: any, property: any) => {
    if (!property.method) {
      errors.push(`
      RPC definition must export an object where properties can only be methods.

      property: ${JSON.stringify(property.key)}

      e.g.:
        ${exportAssignment} {
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
      property.value.returnType &&
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

const relativePath = (from: any, to: any) => {
  let rel = path.relative(path.dirname(from), to);
  if (!rel.match(/^\./)) {
    rel = './' + rel;
  }

  return rel;
};

const prettify = async (generatedFile: any, code: any) => {
  const config: any = await prettier.resolveConfig(generatedFile);
  return prettier.format(code, config);
};
