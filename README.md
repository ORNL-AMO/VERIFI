# About VERIFI
<!-- Badges -->
[![Build Status](https://github.com/ORNL-AMO/VERIFI/actions/workflows/main.yml/badge.svg)](https://github.com/ORNL-AMO/VERIFI/actions)
[![Latest Release](https://img.shields.io/github/v/release/ORNL-AMO/VERIFI)](https://github.com/ORNL-AMO/VERIFI/releases)
[![Issues](https://img.shields.io/github/issues/ORNL-AMO/VERIFI)](https://github.com/ORNL-AMO/VERIFI/issues)
[![Pull Requests](https://img.shields.io/github/issues-pr/ORNL-AMO/VERIFI)](https://github.com/ORNL-AMO/VERIFI/pulls)
[![Contributors](https://img.shields.io/github/contributors/ORNL-AMO/VERIFI)](https://github.com/ORNL-AMO/VERIFI/graphs/contributors)
[![Last Commit](https://img.shields.io/github/last-commit/ORNL-AMO/VERIFI)](https://github.com/ORNL-AMO/VERIFI/commits/main)


VERIFI is a tool that is a member of **Oak Ridge National Laboratory's Industrial Resources** suite of applications. It can be used to to track, visualize, and analyze facility utility data in industrial settings. Development plans for the tool are to incorporate, modernize and expand upon several existing DOE tools (EnPI, EnPI Lite, Energy Footprint Tool, Plant Energy Profiler), most of which currently are excel-based or excel-add ons.

VERIFI, like it's sibling applications [MEASUR](https://github.com/ORNL-AMO/MEASUR) and [JUSTIFI](https://github.com/ORNL-AMO/JUSTIFI), is developed as a web application but is also packaged and distributed as an installable desktop application.
 
The latest web version of the application can be found at [https://verifi.ornl.gov](https://verifi.ornl.gov)

Installable versions of the application can be found under the [releases](https://github.com/ORNL-AMO/VERIFI/releases) section of this repository.

Alternatively, downloads and additional information about ORNL's suite of tools can be found at [ORNL's Industrial Resources](https://industrialresources.ornl.gov/) site.

### 📋 Project Board

Track our progress and planned work on the [VERIFI GitHub Project Board](https://github.com/orgs/ORNL-AMO/projects/9/views/7).

# Details For Developers
This tool is written in the Angular framework (TypeScript) and uses Electron for cross-platform desktop builds.

If you plan to contribute code changes to this repository, please review the [contributing guidelines](CONTRIBUTING.md) first.

### Getting Started

- We are using NodeJS [nodejs.org](https://nodejs.org/en/download). See [`package.json`](./package.json) for currently supported version.
- This project was generated with [Angular CLI](https://github.com/angular/angular-cli), and is typically updated to latest versions of angular as often as is reasonable.
- To install all required packages: `npm install`
- When developing for web, run `npm run start` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

### Electron Development
- It is recommended to develop using the web version of the application unless you want to add an Electron specific feature.
- When developing in the Electron window, use `npm run build-watch` and a re-build will trigger on save of changes.
- After the app is built using the command above, you will have to start the Electron app in a second terminal window. To start the Electron app use `npm run electron`. You will have to kill and restart the Electron app after changes are made.

### Build

- Built artifacts will be stored in the `/dist` directory.
- General build for Electron: `npm run build`
- Production Web Build: `npm run build-prod`
- Production Electron Build: `npm run build-prod-electron`

### Native Installers

- `npm run dist` will create Electron installers for your operating system.
- Installer will be created in an `./output/` directory.

### Mac Code Signing
- Run `electron-builder -m` to build and sign your mac dmg.

- Run `xcrun altool --notarize-app --primary-bundle-id "com.ornl.verifi" --username "<APPLE USERNAME>" --password "<APPLE APP PASSWORD>" --file VERIFI-x.x.x-x.dmg -itc_provider "<CERT UID>" --verbose` to notarize your signed dmg.

- Run `xcrun stapler staple VERIFI-x.x.x-x.dmg` to staple the notarization. 

> **Note:** APPLE APP PASSWORD is an [app-specific password](https://support.apple.com/en-us/HT204397) (not your Apple ID password).

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE) for details.
