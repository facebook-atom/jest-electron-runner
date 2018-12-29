[![CircleCI](https://circleci.com/gh/facebook-atom/jest-electron-runner.svg?style=svg)](https://circleci.com/gh/facebook-atom/jest-electron-runner)


## Jest electron runner
A custom test runner for Jest that runs tests inside an [electron](https://electronjs.org/) main or renderer process providing the following benefits:

- Main
  - all electron instance modules (ipc, app, etc)

- Renderer
  - full access to a browser environment without the need for jsdom or similar modules


## Getting Started

1. Install jest electron runner `yarn add @jest-runner/electron --dev`
2. Add one of these lines to your jest config (in `package.json` or inside your `jest.config.js` file), depending on the process you wish to test. If you wish to test them in parallel, see the tips section below.

    - Main process
    ```js
        {
          // ...
          runner: '@jest-runner/electron/main',
          testEnvironment: 'node',
        }
    ```
    - Renderer Process
    ```js
        {
          // ...
          runner: '@jest-runner/electron',
          testEnvironment: '@jest-runner/electron/environment',
        }
    ```
3. run jest!


<h1 align="center">
    <img src="https://raw.githubusercontent.com/aaronabramov/gifs/master/jest_electron_runner_seutup.gif" />
</h1>

### Debugging
Normally jest-electron-runner runs a headless instance of electron when testing the renderer process. You may show the UI by adding this to your test:
```js
require('electron').remote.getCurrentWindow().show();
```

### Tips
- The main process runner can be used to test any non-browser related code, which can speed up tests roughly 2x.
- To run the main and renderer process tests in parallel, you can provide a config object to the `projects` array in a jest javascript config file like so:
```js
// jest.config.js
const common = require('./jest.common.config')

module.exports = {
  projects: [
    {
      ...common,
      runner: '@jest-runner/electron/main',
      testEnvironment: 'node',
      testMatch: ['**/__tests__/**/*.(spec|test).ts']
    },
    {
      ...common,
      runner: '@jest-runner/electron',
      testEnvironment: '@jest-runner/electron/environment',
      testMatch: ['**/__tests__/**/*.(spec|test).tsx']
    }
  ]
}
```

### [Code of Conduct](https://code.facebook.com/codeofconduct)

Facebook has adopted a Code of Conduct that we expect project participants to adhere to. Please read [the full text](https://code.facebook.com/codeofconduct) so that you can understand what actions will and will not be tolerated.

### [Contributing Guide](CONTRIBUTING.md)

Read our [contributing guide](CONTRIBUTING.md) to learn about our development process, how to propose bugfixes and improvements, and how to build and test your changes to Jest.

## License

[MIT licensed](./LICENSE).
