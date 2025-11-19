# VERIFI Coding Style Guide

## General
- Use TypeScript for all source files.
- Prefer ES6+ features (e.g., `const`, `let`, arrow functions).
- Use Angular’s official style guide as a baseline: https://angular.io/guide/styleguide

## Formatting
- Indentation: 2 spaces, no tabs.
- Line length: 120 characters max.
- Use single quotes for strings (`'example'`), except in JSON.
- End files with a newline.
- Use semicolons at the end of statements.

## Naming
- Classes, interfaces: `PascalCase` (e.g., `UserService`)
- Variables, functions, properties: `camelCase` (e.g., `userName`)
- Constants: `UPPER_CASE` if exported, otherwise `camelCase`
- File names: `kebab-case` (e.g., `user-profile.component.ts`)

## Imports/Exports
- Use ES6 import/export syntax.
- Group imports: Angular first, then third-party, then local.
- Avoid relative imports with long paths; use `tsconfig` paths if possible.

## Components/Services
- One component/service per file.
- Use Angular CLI to generate components, services, etc.
- Use `@Injectable()` for services.
- Use `@Input()` and `@Output()` for component communication.

## Comments & Documentation
- Write meaningful comments, but avoid obvious ones.
- Use `//` for single-line and `/* ... */` for block comments.

## Testing
- All components, services, and utilities should have corresponding `.spec.ts` files.
- Use `describe`, `it`, `beforeEach`, and `afterEach` for test structure.
- Test names should clearly state the expected behavior.

<!--TODO: setup linting
## Linting
- Run `npm run lint` before submitting code.
- Fix all lint errors and warnings.
-->

## Git & PRs
- Write clear, descriptive commit messages.
- Keep pull requests focused and small.
- Reference related issues in PRs.
