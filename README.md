
## Jest electron runner
A custom test runner for Jest that runs tests inside an [electron](https://electronjs.org/) window environment.

## Getting Started

1. Install jest electron runner `yarn add @jest-runner/electron --dev`
2. Add these lines to your jest config (in `package.json` or inside your `jest.config.js` file)


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


### [Code of Conduct](https://code.facebook.com/codeofconduct)

Facebook has adopted a Code of Conduct that we expect project participants to adhere to. Please read [the full text](https://code.facebook.com/codeofconduct) so that you can understand what actions will and will not be tolerated.

### [Contributing Guide](CONTRIBUTING.md)

Read our [contributing guide](CONTRIBUTING.md) to learn about our development process, how to propose bugfixes and improvements, and how to build and test your changes to Jest.

## License

[MIT licensed](./LICENSE).
