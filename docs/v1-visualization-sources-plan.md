# VIS5 source handoff

The scoped development work for [VIS5 #2906](https://github.com/ORNL-AMO/VERIFI/issues/2906) is complete under focused acceptance. This file replaces the completed source plan with its handoff; the [Visualizations and Home plan](v1-visualizations-and-home-plan.md) owns later milestones and remaining production-shell/release acceptance. No remote issue has been closed by this handoff.

## Slice status

| Slice | Status |
| --- | --- |
| P1 — Saved predictor selection | Complete |
| P2 — Weather and quality hardening | Complete |
| P3 — Compatible combinations | Complete |
| P4 — Predictor acceptance | Complete |
| E1 — Equipment history | Complete |
| E2 — Groups and facilities | Complete |
| E3 — Energy Uses acceptance | Complete |
| A1 — Facility analysis results | Complete |
| A2 — Account analysis results | Complete |
| A3 — Standalone saved models | Removed from delivery scope |
| A4 — Analysis acceptance | Complete |

## Current contract owners

Completed implementation details belong to the current feature references rather than this retired development plan.

| Concern | Current owner |
| --- | --- |
| Predictor observations, saved weather and compatible meter/predictor combinations | [Predictor observations](v1-visualization-foundation.md#predictor-observations), [Predictor setup](v1-visualization-workbench.md#predictor-setup) |
| Annual equipment estimates, carry-forward, groups/facilities and source identity | [Equipment annual history](v1-visualization-foundation.md#equipment-annual-history), [Equipment setup](v1-visualization-workbench.md#equipment-history-setup), [Energy Uses](v1-energy-uses-architecture.md) |
| Facility totals and selected-group results | [Facility result meaning](v1-visualization-foundation.md#facility-analysis-results), [Facility setup](v1-visualization-workbench.md#facility-analysis-setup), [Facility result orchestration](v1-facility-analysis-architecture.md#saved-visualization-consumption) |
| Saved account totals and facility selection rules | [Account result meaning](v1-visualization-foundation.md#account-analysis-results), [Account setup](v1-visualization-workbench.md#account-analysis-setup), [Account orchestration](v1-account-analysis-architecture.md#saved-visualization-consumption) |
| Saved identities, source repair, transfers, conflicts and committed-publication recovery | [Persistence](v1-visualization-persistence.md), [Workbench](v1-visualization-workbench.md) |

## Retained scope decisions

New account-analysis choices appear only under All Facilities. Individual/fixed facility inclusion offers facility analyses only. Existing account bindings preserve their exact saved roster: excluding a selected facility makes results unavailable instead of calculating a filtered total. Explicit skips do not enlarge that total. Source and group GUIDs, compatible appearance and protected transfer references remain exact repairable intent.

Add requires a named analysis through the report-style radio-card selector. Result scope, period, measure and appearance are workbench settings. Do not reintroduce Skip, Clear selection, Open the named analysis or extra instructional help. Viewing does not initialize hidden single-facility analysis pairs or write source analyses, readings or predictors.

Analysis dates filter full authoritative calculations; they never change baselines, adjustments, banking or membership. Follow saved analysis units/basis and fiscal/result horizons, including the selected-group fallback when another group is incomplete. Preserve real zero, missing/nonfinite gaps, partial evidence, banking exclusions and signed percentage losses. Calculated use remains the adjusted analysis result.

A3 is intentionally excluded. There is no standalone model inspection, residual, model-comparison or new user-defined model identity feature in VIS5. Existing model-shaped definition fields and qualified references remain preserved and unsupported. They must not be silently converted to result sources or rebound to another model. This scope decision does not alter model functionality in Analysis/reports.

Only active consumers demand full analysis results. Canonical calendarization/status have their existing separate lifecycle. Date resolution and source projection share an acquisition; matching numerical results can be reused after current validation, while obsolete account/session/snapshot/revision evidence cannot publish or seed current results. Retry, deactivation and teardown preserve these rules without source writes.

## A4 acceptance

The coverage audit reused existing A1–A2 projection, Worker, readiness, timeout/retry and backup tests and shared editor/recovery tests. Additional composition coverage establishes:

- Facility total, selected group and account total previews reject late results across account switch-and-return and same-account reload. Changes during shared date resolution or asynchronous presentation cannot publish old values. Display edits reuse matching calculations; fiscal/input changes invalidate them.
- Error/retry, selected-group fallback and shorter horizons, skipped/missing targets, new unassigned account facilities and all-skipped account results retain explicit states and recover exact intent. Unsupported model intent starts no full analysis work and never falls back by name or mode.
- Production Add/workbench controls use native IndexedDB and real result Workers through autosave, remount, database reopen, reviewed rebind cancellation, stale review, rejected-save retry, external configuration conflict and committed-publication recovery without replaying a write.
- Real Analysis deletion/reload retains broken chart references. A same-name replacement is unavailable until explicit repair is confirmed. Account inclusion changes preserve saved selections/appearance, never calculate a subset, and restore correctly when All Facilities returns. Chart operations leave source records unchanged.
- Current Account/Facility backup and shared transfer suites preserve mapped values/appearance and block unavailable account or foreign references, including destination collisions and repeat-transfer preservation.
- Keyboard selection/retry/review, accessible underlying values, wide/light and narrow/dark workbench layouts and print media were checked. Print omits workbench header controls as well as settings and value disclosures, while retaining the chart and title.

The focused fast and native browser matrices pass, as do app type-checking, documentation links/headings and diff whitespace checks. Existing browser-support warnings remain. A4's production change is confined to print styling; the style-compiling native tests and visual print check validate it. The A1/A2 production web build passed earlier; it was not repeated for this styling/test-only acceptance slice.

## Remaining acceptance and continuation

No source-development slice remains in this plan. A3 is not a prerequisite for completing VIS5. Preserve the current contracts when addressing any later review findings; do not start VIS6 or another source/chart capability automatically.

Full regression/release gates, broader real-data/issue acceptance and VIS4 production-shell QA remain separately tracked in the parent plan and PR/CI workflows. Electron builds and native OS print-dialog checks were not performed for A4 because no Electron or OS boundary changed. Browser print-media evidence does not claim native print-dialog coverage.

Use the [testing policy](testing.md), [validation workflow](../.agents/skills/validate-web-and-electron/SKILL.md) and [PR workflow](agents/pr-workflow.md) for the next explicitly requested review/release task. Completed development plans and detailed execution history remain available in Git.
