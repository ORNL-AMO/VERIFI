# Utility visualizations

This reference owns implemented utility selection/projection, definition-v2 display intent, initial unstacked line/bar editing, recipes, and inventory capture. See [foundation](v1-visualization-foundation.md) for shared meaning, [persistence](v1-visualization-persistence.md) for transfers/commands, [workbench](v1-visualization-workbench.md) for lifecycle, and the [phase plan](v1-visualizations-and-home-plan.md) for remaining breadth.

## Selection and authoritative values

Fixed meters retain exact GUIDs. Fixed groups retain group identity and follow current membership; matching rules explicitly include future matches. Missing anchors require repair rather than broader scope. Retired historical meters are included by default. New matching series use stable defaults while resource-specific overrides remain effective.

Latest-data anchors use provider-validated observations, including real zero, excluding unavailable/post-retirement observations. Portfolio fiscal periods follow account settings and facility periods follow facility settings. Units and energy treatment declare follow-owner or pinned values. Monthly/yearly data uses canonical calendarization/conversions rather than a new formula boundary.

Emissions require authoritative inclusion evidence; display flags alone do not establish coverage. Saved-input checks inspect actual energy/volume fields. V1 calculation requests combine the loaded bundled grid catalog with current custom rates and include those rates in freshness. Grid-dependent previews await catalog readiness and reject missing coverage rather than accepting fallback zero.

Native observations retain bill identity and actual dates without invented prorating. Native charges retain individual meter/charge amount or supported usage/demand meaning; monthly charge allocation, cross-meter category totals, and summed demand are unavailable.

Partial totals show valid isolated contributions and omitted-input reasons. No valid observations means unavailable, never zero. Ambiguous/invalid normalized inputs cannot justify computed observations. Preserve missing, excluded, retired, estimated/mixed, duplicate, partial, and alignment-padding meanings. Separate sources may compare overlapping contributions; totals deduplicate meters and block double counting. Scientific formulas and source records remain authoritative.

## Definition compatibility and display overrides

Current definition version 2 adds saved visibility and owner-qualified appearance overrides. Each selects exactly one resource GUID or stable provider-local series ID. Provider IDs identify categories such as utility sources and unassigned groups, not domain GUIDs or required anchors. Resource overrides win over category overrides resolving to the same series. Explicit nonnegative integer order precedes new/unordered matches; appearance-only edits preserve provider ordering, and absent order never moves a member.

Version 1 decodes to equivalent current intent in memory; opening alone never writes. Actual edits save the current version. Equivalent historical duplicate proposals compare decoded intent without modifying the original record. Older builds cannot edit version-2 definitions. Database structure, record envelopes, and backup container versions remain distinct and unchanged by this display extension.

Overrides outside current matching membership stay dormant rather than becoming missing-source anchors. Copy/backup remaps known resource appearance references and qualifies unmapped ones to prevent accidental activation in another account. Ordinary local source/total category appearance follows the copied account. The known utility Unassigned category embeds a facility GUID and is rebuilt only through the explicit facility map. Unmapped Unassigned identities preserve owner qualification, visibility/order/appearance, and dormancy without adding an anchor; previously foreign overrides remain foreign/dormant. Charge metric selectors use explicit mapped charge identity; unknown selectors and blocked references retain original intent. Unknown definitions remain preserved through persistence.

## Supported behavior and limitations

| Capability | Current behavior |
| --- | --- |
| Calendarized | Energy, compatible consumption/water, cost, location/market emissions; monthly/yearly, owner fiscal settings, fixed/rolling/history, and supported comparisons. |
| Native bills | One meter's dated bill occurrences. Multiple measures from that meter share its occurrence alignment; different meters are not implicitly paired. Native comparisons/group totals are unavailable. |
| Named charges | Recorded amounts for supported categories; consumption/sewer quantity uses the bill editor's starting unit and electricity demand its demand unit. Fee/tax and generic usage/MDQ quantity without an established bill-editor unit, and summed demand, are unavailable. |
| Live series | Wildcards discover future matches. Resource/provider-qualified labels, colors, axes, visibility, and ordering persist; absent overrides stay dormant. |
| Capture | Unfiltered inventory Energy/Water/Cost charts preserve actual resource identities, grouping, selection, trace order, reproducible values, and representable appearance/settings. Search/status filters, unassigned groups, unsupported dash patterns, and changed quality interpretations explain and block capture. Zoom remains temporary. |
| Editing | Invalid source/date drafts survive metadata saves; same-configuration external changes require explicit saved/local review. Recovery protects incomplete child fields. |

Energy usage trend and Utility cost trend recipes require explicit saved-meter binding and create independent definitions. Additional utility sources can be added; unsupported families may be explicitly removed without altering their records. Grouping changes reset resource-specific preferences because their identity namespace changes. Explicit resource changes replace obsolete exact-series anchors with live selection while retaining same-grouping appearances as dormant overrides.

Only unstacked Line and Bar rendering is implemented here. Other source families, chart types, capture locations, and Home remain pending. Quality notices expand for dense portfolios and visibly identify partial coverage. Underlying values use shared pagination and print all rows. Zoom and temporary trace-panel state are not saved.

Purchased compressed air remains unavailable where the existing canonical formula yields nonfinite emissions. Correcting that formula is separate work. Existing v0 behavior, report outputs, weather retrieval, and Electron IPC are unaffected by this visualization boundary.

## Validation

Protect selection/overlap, periods/fiscal meaning, actual inputs, real zero versus unavailable/partial data, units/charges, overrides/dormancy, repeated transfers, invalid-field protection, and capture fidelity with focused deterministic tests. Native coverage protects IndexedDB copy/backup/reopen, active-preview Worker lifecycle, and composed source-data journeys. Check charts, keyboard/focus, themes, responsive layouts, and printing where changed. Select commands and broader gates through [testing policy](testing.md) and the validation planner; historical per-stack execution exceptions do not define future validation policy.
