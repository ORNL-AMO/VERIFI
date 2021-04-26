# Verifi
### Downloads  ![Github Releases](https://img.shields.io/github/downloads/ORNL-AMO/VERIFI/latest/total.svg?label=Current%20Release)  ![Github All Releases](https://img.shields.io/github/downloads/ORNL-AMO/VERIFI/total.svg?label=All%20Time&colorB=afdffe)

The Department of Energy Advanced Manufacturing Office has tasked Oak Ridge National Laboratory to develop a tool to track, visualize, analyze and even forecast facility utility data in industrial settings. This tool will incorporate and expand on several existing DOE tools (EnPI, EnPI Lite, Energy Footprint Tool, Plant Energy Profiler), most of which currently are excel-based or excel-add ons. This project will integrate them into a common, open-source framework which is harmonized with other DOE software tools – mainly the DOE’s [MEASUR tool suite](https://github.com/ORNL-AMO/AMO-Tools-Desktop).

## Dependencies
- Node.js (https://nodejs.org/en/)


## Build
- To remove all project-related node modules: `npm run clean` from the root project directory

- To install all required packages: `npm install`

- Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `--prod` flag for a production build.

- To start the electron app: `npm run electron`


## Running tests

- Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

- Run `ng e2e` to execute the end-to-end tests via [Protractor](http://www.protractortest.org/).


## For Developers
- Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

- Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

- For more information, see [the angular docs](https://docs.angularjs.org/guide/component)


### Mac Code Signing
- Run `electron-builder -m` to build and sign your mac dmg.

- Run `xcrun altool --notarize-app --primary-bundle-id "com.ornl.verifi" --username "<APPLE USERNAME>" --password "<APPLE APP PASSWORD>" --file VERIFI-x.x.x-x.dmg -itc_provider "<CERT UID>" --verbose` to notarize your signed dmg.

- Run `xcrun stapler staple VERIFI-x.x.x-x.dmg` to staple the notarization. 

> **Note:** APPLE APP PASSWORD is an [app-specific password](https://support.apple.com/en-us/HT204397) (not your Apple ID password).