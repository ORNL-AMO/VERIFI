# Verifi

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 8.3.13.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `--prod` flag for a production build.

### Mac Code Signing
Run `electron-builder -m` to build and sign your mac dmg.

Run `xcrun altool --notarize-app --primary-bundle-id "com.ornl.verifi" --username "<APPLE USERNAME>" --password "<APPLE APP PASSWORD>" --file VERIFI-x.x.x-x.dmg -itc_provider "<CERT UID>" --verbose` to notarize your signed dmg.

> **Note:** APPLE APP PASSWORD is an [app-specific password](https://support.apple.com/en-us/HT204397) (not your Apple ID password).

Run `xcrun stapler staple VERIFI-x.x.x-x.dmg` to staple the notarization. 

## Build for web deployment  

Run 'npm run web-build' to build the project with the correct base href of "." in the generated index.html file placed in the dist folder.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via [Protractor](http://www.protractortest.org/).

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI README](https://github.com/angular/angular-cli/blob/master/README.md).
