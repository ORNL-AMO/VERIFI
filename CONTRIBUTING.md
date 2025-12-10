# VERIFI Contributing Guidelines

## Code of Conduct

This project and everyone participating in it is expected to adhere to our [Code of Conduct](./CODE_OF_CONDUCT.md). Please read it to understand the standards of behavior for participation.

## Getting Started

These contributing guidelines should be read by software developers wishing to contribute code or
documentation changes into VERIFI, or to push changes upstream to the main ORNL-AMO/VERIFI repository.

Public contributions to this project are very much welcomed. However, this project is actively maintained by a group of core developers. Project work by the core development team will take priority to outside contributors. For those looking to contribute externally on existing issues, please check the status of the issues on the project board below and reach out to the team via comment on the issue to ensure the work is ready to be executed and not in the scope of one of the core developers.

### 📋 Project Board

Track our progress and planned work on the [VERIFI GitHub Project Board](https://github.com/orgs/ORNL-AMO/projects/9/views/7).

## Issue Tracking

New feature requests, changes, enhancements, and bug reports can be filed
as new issues in the [Github.com issue tracker](https://github.com/ORNL-AMO/VERIFI/issues).
Please be sure to fully describe the issue.

### Issue Submission Checklist

1. Search the [issue tracker](https://github.com/ORNL-AMO/VERIFI/issues) to see if your issue already exists. If so, please make a comment there or add a reaction to the issue.

2. Is this an individual bug report or feature request?
3. Can the bug or new feature be easily reproduced?
   1. Be sure to include enough details about your setup and the issue you've encountered
   2. Simplify as much of the process as possible to better isolate the problem.

## Repository Layout

The VERIFI repository is hosted on Github, and located here: http://github.com/ORNL-AMO/VERIFI

This repository is organized using a modified git-flow system. Branches are organized as follows:

- master: Stable release version. Must have good test coverage and may not have all the newest features.
- develop: Development branch which contains the newest features and issues will be tracked in the latest release milestone. Tests must pass, but code may be unstable as issues work through the QA phase.
- issue-xxx[-description]: Feature or bug fix branch from develop, should reference a github issue number. You may provide an optional short description in the branch name.
- fix-xxx[-description]: Bug fix branch from develop, should reference a github issue number. You may provide an optional short description in the branch name.
- epic-xxx[-description]: In some cases, a large feature will be broken down into a subset of issues. Will the large feature is developed, the small issues can't be added to develop without the totality of the epic being finished. Use an epic branch to create incremental pull requests of smaller issues into the larger epic feature.

For external developers, please create a fork of VERIFI in your own account.
Internal developers may choose to work on issue and fix branches directly in the ORNL-AMO/VERIFI repo.
Be sure to periodically synchronize the upstream develop branch into your feature branch to avoid conflicts in the pull request.

## Pull Requests

Pull requests must be made for all changes. Most pull requests should be made against the develop
branch unless patching a bug that needs to be addressed immediately, and only core developers should
make pull requests to the main branch.

All pull requests, regardless of the base branch, must include updated documentation and pass all
tests. In addition, code coverage should not be negatively affected.

When your branch is ready, make a pull request to the develop branch of ORNL-AMO/VERIFI through the
[GitHub web interface](https://github.com/ORNL-AMO/VERIFI/pulls). Pull requests must reference an issue number. If an issue does not yet exist, please create one.

<!--TODO: Setup CLA
When submitting a pull request, you
will need to accept the Contributor License Agreement(CLA) (This is TBD - See [Issue #8](https://github.com/NREL/NEB-Tool/issues/8)).
-->

### Scope

Encapsulate the changes of one issue, or multiple if they are highly related. **Three small pull
requests is greatly preferred over one large pull request.** Not only will the review process be
shorter, but the review will be more focused and of higher quality, benefitting the author and code
base. Be sure to write a complete description of these changes in the pull request body.

<!-- TODO: testing not setup properly
## Tests

All tests must pass. Pull requests will be rejected or have changes requested if tests do not pass,
or cannot pass with changes. Tests are automatically run through Github Actions for any pull request
or push to the main or develop branches, but should also be run locally before submission.

All code changes should be paired with a corresponding unit or integration test. A description of how to run tests using Karma is provided in the [Readme](README.md).

### Test Automation

All pull requests are automatically tested using GitHub Actions. The CI workflow unit tests, and build checks on every PR and push to main or develop. You can view the status of these checks in the PR interface. Please ensure your code passes all automated checks before requesting a review.

### Test Coverage

At this time, our primary requirement is that all existing and new tests pass when a pull request is opened. While we encourage writing tests for new code, we do not currently enforce a specific code coverage threshold.
-->
## Documentation

All new features, changes, and bug fixes should be accompanied by relevant documentation updates. This includes updating code comments, the README, and any relevant files in the docs/ directory. Well-documented code and features help other contributors and users understand and use the project effectively.

### Changelog

All changes must be documented appropriately in the pull request body on Github. The core developers will aggregate the descriptions in the pull request body into releases.

## Coding Style

Please follow the coding standards outlined in [CODING_STYLE.md](./CODING_STYLE.md) for all contributions. This ensures consistency and readability across the codebase.

## Release Process

Releases are managed by the core development team. An "Epic" issue and a Milestone are used to track the issues going into the next release of VERIFI. Our QA team will test issues via the project board. When QA has been completed on the full set of "Epic" issues develop is merged into main and a release will be drafted by the CI system. Release notes are compiled from the changelog entries in PRs. Version numbers follow semantic versioning. Only core maintainers should publish releases.

### Versioning

VERIFI uses [semantic verisoning 2.0.0](https://semver.org/spec/v2.0.0.html). An example version specification for VERIFI looks like `0.0.1-alpha`. Core developers will be responsible for version numbers and releases.

The following is reproduced from semver.org:
```
Given a version number MAJOR.MINOR.PATCH, increment the:

MAJOR version when you make incompatible API changes
MINOR version when you add functionality in a backward compatible manner
PATCH version when you make backward compatible bug fixes
Additional labels for pre-release and build metadata are available as extensions to the MAJOR.MINOR.PATCH format.
```
