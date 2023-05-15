# Verifi
### Downloads  ![Github Releases](https://img.shields.io/github/downloads/ORNL-AMO/VERIFI/latest/total.svg?label=Current%20Release)  ![Github All Releases](https://img.shields.io/github/downloads/ORNL-AMO/VERIFI/total.svg?label=All%20Time&colorB=afdffe)

The Department of Energy Advanced Manufacturing Office has tasked Oak Ridge National Laboratory to develop a tool to track, visualize, analyze and even forecast facility utility data in industrial settings. This tool will incorporate and expand on several existing DOE tools (EnPI, EnPI Lite, Energy Footprint Tool, Plant Energy Profiler), most of which currently are excel-based or excel-add ons. This project will integrate them into a common, open-source framework which is harmonized with other DOE software tools – mainly the DOE’s [MEASUR tool suite](https://github.com/ORNL-AMO/AMO-Tools-Desktop).

## Dependencies
- Node.js (https://nodejs.org/en/) (v16.14.2 is best option)


## Build
- To install all required packages: `npm install`

- Built artifacts will be stored in the `/dist` directory.

- General build for electron `npm run build`

- Production Web Build `npm run build-prod`

- Production Electron Build `npm run build-prod-electron`



## Native Installers

- `npm run dist` will create electron installers for your operating system

- Installer will be created in an `/output/verifi/` directory in the parent directory you run the command in


## Running tests

- Run `npm run test` to execute the unit tests via [Karma](https://karma-runner.github.io).

- Run `npm run e2e` to execute the end-to-end tests via [Protractor](http://www.protractortest.org/).


## For Developers

- When developing in electron window use `npm run build-watch` and a re-build will trigger on save of changes

- To start the electron app (kill and restart app after rebuild on save): `npm run electron`

- When developing for web run `npm run start` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

- Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

- For more information, see [the angular docs](https://docs.angularjs.org/guide/component)


### Mac Code Signing
- Run `electron-builder -m` to build and sign your mac dmg.

- Run `xcrun altool --notarize-app --primary-bundle-id "com.ornl.verifi" --username "<APPLE USERNAME>" --password "<APPLE APP PASSWORD>" --file VERIFI-x.x.x-x.dmg -itc_provider "<CERT UID>" --verbose` to notarize your signed dmg.

- Run `xcrun stapler staple VERIFI-x.x.x-x.dmg` to staple the notarization. 

> **Note:** APPLE APP PASSWORD is an [app-specific password](https://support.apple.com/en-us/HT204397) (not your Apple ID password).
