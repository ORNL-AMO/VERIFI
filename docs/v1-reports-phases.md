# V1 Reports remaining work

Active delivery reference for [Reports foundation #2790](https://github.com/ORNL-AMO/VERIFI/issues/2790) and its report migrations. [Report architecture](v1-reports-architecture.md) owns current contracts and extension patterns; the [scope-qualified catalog](../src/app/v1/reports/catalog/report-catalog.ts) owns implemented/pending capabilities. Issue bodies own detailed acceptance, not this document.

## Current foundation and decisions

The unified inventory and saved-report lifecycle are implemented. Account/facility hosts share Setup, applicable Data Checks, Report stages, typed editing, guarded navigation, status destinations, and runtime registration. Pending content is distinct from saved-configuration status; opening an existing report preserves settings/GUIDs and does not reconcile ownership on browse. Single-facility presentation retains account-backed reports through explicit hidden analysis pairs.

Better Plants has energy/water setup, explicit analysis review, in-app official-form content, direct PDF, and template-compatible Excel. Facility Analysis has typed setup, selected-year checks/review, continuous in-app content, PDF, and PowerPoint. Their outputs share snapshot/readiness and delivery infrastructure; other report content remains pending. Existing calculations, v0 behavior, persisted relationships, templates, and known compatibility quirks remain authoritative.

Build each remaining report as a feature-owned runtime using shared editing/check/result/output capabilities. Do not add report-type branches to the workbench. Output support is explicit per format. In-app completion does not establish output or release acceptance.

## Remaining migrations and dependencies

| Owner | Work |
| --- | --- |
| Facility reports | Data Overview [#2792](https://github.com/ORNL-AMO/VERIFI/issues/2792), Savings [#2794](https://github.com/ORNL-AMO/VERIFI/issues/2794), Modeling [#2795](https://github.com/ORNL-AMO/VERIFI/issues/2795), Cost Savings [#2796](https://github.com/ORNL-AMO/VERIFI/issues/2796), Data Quality [#2797](https://github.com/ORNL-AMO/VERIFI/issues/2797), Emission Factors [#2798](https://github.com/ORNL-AMO/VERIFI/issues/2798). Reuse current lifecycle and report adapters. |
| Account reports | Data Overview [#2799](https://github.com/ORNL-AMO/VERIFI/issues/2799), Savings [#2800](https://github.com/ORNL-AMO/VERIFI/issues/2800), Analysis/Modeling [#2801](https://github.com/ORNL-AMO/VERIFI/issues/2801), Performance [#2802](https://github.com/ORNL-AMO/VERIFI/issues/2802), Emission Factors [#2803](https://github.com/ORNL-AMO/VERIFI/issues/2803), Other Impacts [#2805](https://github.com/ORNL-AMO/VERIFI/issues/2805). |
| Implemented reports | Better Plants [#2804](https://github.com/ORNL-AMO/VERIFI/issues/2804) and Facility Analysis [#2793](https://github.com/ORNL-AMO/VERIFI/issues/2793) retain issue-owned remaining acceptance; implementation is not automatic issue closure. |
| Shared output | [#2791](https://github.com/ORNL-AMO/VERIFI/issues/2791) supplies the implemented PDF/PPTX/XLSX foundation; later reports provide their own adapters. Final cross-report output verification belongs to [#2806](https://github.com/ORNL-AMO/VERIFI/issues/2806). |

## Acceptance gaps

- Analysis Used By integration remains explicitly deferred under #2790; informational references/screens were not completed by the foundation audit.
- Native Electron interaction and manual screen-reader verification remain unperformed for the Reports foundation. Chromium keyboard/layout checks do not satisfy these manual gaps.
- Browser printing, presentation mode, remaining report content/formats, and final cross-report release verification remain separate work.
- Preserve explicit unavailable fixes for settings/content that have not migrated. Do not represent a saved configuration or working status link as implemented report content.

Apply [testing policy](testing.md) and the [validation workflow](../.agents/skills/validate-web-and-electron/SKILL.md) to each implementation. Report-specific checks protect authoritative values, lifecycle/cancellation, generated-file structure and layout, GUID/backup relationships, and scoped navigation; integrated output acceptance does not defer each report's focused checks.
