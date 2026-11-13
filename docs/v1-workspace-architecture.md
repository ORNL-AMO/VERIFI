# V1 workspace architecture

Current reference for shell context, navigation, shared inventories, and workspace interaction lifetimes. Read the relevant section for the affected behavior. Feature editing belongs to [Data editing](v1-data-editing-architecture.md), equipment workflows to [Energy Uses](v1-energy-uses-architecture.md), analysis ownership to [account analysis](v1-account-analysis-architecture.md), and findings to [validation rules](v1-data-validation-rules.md).

## Routes and accepted context

Root routing opens `/v1`; legacy public URLs remain under the v0 shell. V1 uses feature-owned NgModules and routes. Pure route types, parsers, explicit-ID builders, inventory recognition, and scope serialization live in [`workspace-route.ts`](../src/app/v1/routing/workspace-route.ts). They must not read workspace state or import runtime shell services.

[`WorkspaceContextService`](../src/app/v1/shell/workspace-context.service.ts) owns an atomic previous/current URL pair, accepted route identity and motion, and readonly committed ownership, resource, scope, and count projections. Only successful `NavigationEnd` advances that URL pair. Context does not navigate or write data. `WorkspaceNavigationService` owns guarded shell commands, destination policy, invalid-scope cleanup, and panel state; its instance builders delegate to pure route functions. Support-panel presentation is a pure projection, while status evaluation retains its own lifetime.

Portfolio inventory scope comes from validated `?facility=<guid>`; absence means All facilities. Scope is independent of durable selection hints and route ownership. Facility workbenches show their owner; account-owned workbenches show All facilities. Normalize an unavailable inventory scope only after account readiness, with explanatory feedback; never choose an arbitrary facility. Rejected or failed navigation preserves the accepted context and motion.

The portfolio chooser keeps a permanent All facilities choice, committed portfolio ordering, name/location search, keyboard access, and distinct no-facilities/no-matches states. The account-name action clears scope through guarded navigation; the VERIFI brand opens Home for account selection. Explicit Facilities navigation clears scope. The Data rail opens Facilities at All facilities and scoped Meters under a named facility. Account/facility breadcrumbs and sidebar tools use the same effective context. Named scope excludes account-owned Analysis and Reports even when those records reference that facility.

Path exits from Data inventory leaves and Analysis use registration-backed leave protection, including sibling/history navigation while parent drawers are active. Query-only transitions retain their scope policy and unavailable-scope normalization. Reports keeps its own leave protection. Shell account/scope actions and route guards resolve asynchronous editor preflights before another account can publish. Data editing policies remain feature-owned.

Async completions check captured ownership and component lifetime before navigation, output, error, or focus effects. Durable commits are not undone when their view disappears. Successful creation/copy releases blocking state, closes the parent drawer, then opens the committed record; failed navigation must not offer to create it again.

## Browse restoration and Recents

[`BrowseStateService`](../src/app/v1/shared/navigation/browse-state/browse-state.service.ts) keys filters, page, detail, overrides, scroll, and focus by account, inventory kind, and optional facility GUID. Hydrate destination filters before restoring its page. Restore scroll and resource focus only after feature readiness and Angular rendering. Native browser anchoring handles ordinary card expansion; no card-grid measurements govern restoration.

Account breadcrumbs return to the matching unfiltered inventory; facility breadcrumbs return to its owner-filtered inventory. Meter Groups return to Meters. Browser history restores the exact source view; specialized report-to-analysis and inspection returns retain their explicit origins. Upload keeps initial `facilityGuid` separate from inventory `facility` and carries an independently validated `returnUrl`. Only Data inventories/workbenches qualify as captured returns; other origins use the existing fallback.

Browse state is memory-only. Existing local-storage detail preferences seed unseen scopes with nonblocking storage failures; browse state never enters IndexedDB or backups. Same-component headers and filters share a CSS sticky stack. Header-height observation is opt-in only where a routed child owns the toolbar.

At All facilities in portfolios, Analysis and Reports expose up to five recent facility-owned workbenches per account/resource. Record successful visits against committed GUID ownership, waiting for readiness on deep entry. Resolve current labels/routes when presenting history and filter deleted, foreign, or unavailable items. Recents never writes records or requests calculations.

## Inventory ownership and transactions

Features own committed projections, filtering, sorting, permissions, commands, and navigation. Shared tile/grid components own responsive presentation, accessible detail toggles, and typed actions/selection. Ownership links emit explicit facility scope requests; normal titles open workbenches. Do not mutate remembered facility selection to perform an inventory action.

Apply scope and local filtering before global sorting, pagination, counts, chart demand, comparison choices, and print. Clearing local filters preserves header scope. Grid placement retains sorted DOM reading order without dense backfilling or DOM measurement. Feature actions supply explicit account/facility GUIDs; shared cards do not inject mutation services.

Meter/Predictor route owners construct `InventorySelectionController` and `InventoryChartController` from readonly context, entire-scope, matching, and filter signals. The scoped header registry receives selection availability/state and a toggle command, with identity-checked cleanup. `InventoryToolsComponent` owns portals and focus; controllers own selection, reviewed command orchestration, chart demand, and route-lifetime state. Root-lived chart-session memory preserves cloned per-context preferences across route recreation. Keep Meter workbench/grouping provider hosts and Predictor workbench providers scoped to their resource lifetime.

Selection spans pages and clears on filter/scope changes. Bulk deletion reviews complete owner-grouped snapshots and dependency consequences. Handlers revalidate ownership and reviewed data inside one native transaction, roll back every participant on failure, and publish once after commit. Preserve existing single-resource commands and committed-publication recovery. Energy Use grouping and annual commands retain their [feature contracts](v1-energy-uses-architecture.md).

## Inventory charts and capture

Resource-owned pure projections shape charts; the shared renderer owns canvas lifetime and resizing. Meter energy/water/cost projections reuse one canonical calendarization result with account settings at All facilities and facility settings under named scope. Group, facility, and individual series retain owner/GUID provenance, qualified labels, and Unassigned grouping. Never replace missing observations with zero or confuse genuine gaps with alignment padding. Meter totals must match their represented individual contributions without double counting.

Predictor charts use saved histories only, preserving units, duplicate observations, and gaps without weather retrieval or automatic aggregation/conversion. Default single-history selection uses radios; explicit multiple-predictor mode compares raw values on a shared scale labeled Units ignored. Keep original units in accessible labels.

Charts follow all matching items rather than the current page. Offer meter metrics with finite samples, including real zero; trace visibility does not determine availability. A sole available metric needs no toggle; an unavailable choice falls back to the first available metric. Chart demand remains lazy and ends with its route/controller lifetime.

Scope-keyed chart memory retains grouping, metric, visibility, zoom, and Predictor mode. Charts stay open across scope changes while bulk selection clears. Facility-grouped trace metadata separates short names from full owner-qualified labels. Checkboxes control visibility; double-click/keyboard activation isolates a trace or facility, and repeating restores current traces. Collapse retains visibility. Hover/focus changes presentation without recalculation or zoom changes. Narrow trace panels become focus-managed drawers.

The chart sheet keeps the header chooser accessible while the shell dims and makes routed content inert below the actual header. Closing/replacing the portal clears blocking before restoring focus; print omits the backdrop. Comparison sessions keep two ordered choices and clear on context changes.

Inventory capture preserves actual membership, grouping, resource identities, order, appearance, settings, and measured-value/quality meaning. Explain and block capture when that fidelity cannot be represented. Keep one proposal identity across write retry or committed-refresh recovery; pending capture participates in sheet-close protection. Saved intent and provider/version compatibility belong to [utility visualizations](v1-utility-visualizations.md).

## Single-facility presentation and Settings

The [single-facility projection](../src/app/v1/shared/navigation/single-facility-presentation.ts) requires a ready committed account marked single-facility and exactly one owned facility. A one-facility portfolio remains a portfolio; zero/multiple owned facilities retain recovery. Never derive an owner from remembered selection.

Valid single-facility Meters, Predictors, and Analysis use implicit sole-facility scope without a query parameter. Hide redundant ownership controls while retaining explicit owner GUIDs in creation/commands and workbench return links. Reports combines account/facility records, qualifies overlapping format names, and preserves account-backed formats. Keep hidden analysis pairs out of inventories. Pair creation/synchronization and analysis-route repair follow [account-analysis rules](v1-account-analysis-architecture.md); report browsing uses existing saved pairs rather than initializing or reconciling them. Portfolio conversion restores scope choices without changing identities or relationships.

Single-facility Settings reuses facility editors and effective-value editing without entry-time reconciliation. Profile, units, goals, and financial mirroring validates explicit identities against current durable account/facility records, applies only the edited group in one native transaction, and publishes both once. A failed participant retains the draft and changes neither record. Preserve portfolio saves, facility-only fields, and the separate Data Validation command. Shared typed builders preserve optional and disabled-control values.

Complete Backup uses account backup; facility-only tools retain explicit ownership, and direct sole-facility Backup entry canonicalizes to account Backup. Manual downloads flush registered edits, capture coherent snapshots through the shared export coordinator, suppress duplicates, and report cancellation/failure. Account JSON/ZIP and facility JSON retain supported formats. Only an initiated full-account download updates the existing reminder timestamp; facility downloads do not count, and initiation does not certify disk delivery. Seven-/thirty-day reminders remain nonblocking.

## Support, modals, and focus

To-dos owns loading, evaluation progress, and unavailable-check detail. Data/Analysis navigation contains destinations and attention badges, suppressing counts while checks are unavailable. A header action appears after one second of continuous checking or immediately on failure and opens/focuses To-dos. Explicit requests reveal the support overlay below the side-by-side breakpoint. Brief checks and completion remain quiet. These states do not alter persistence/evaluation timing; save feedback stays with the editor. See [validation/status rules](v1-data-validation-rules.md).

Workspace confirmations use `TemplatePortal`, `ModalPortalService`, and `ConfirmationDialogComponent` at the shell outlet because routed content creates an isolated stacking context. Features own pending actions, explanation, busy state, and commands; shared presentation owns backdrop, focus trap, Escape handling, responsive sizing, and theme tokens. Hide portals on confirmation, cancellation, and destruction. Do not add feature backdrop/dialog/z-index overrides.

CDK-backed focus containment keeps only the top modal active, retains a focusable container during busy states, and respects workflow close guards. Restore to a connected, visible, enabled opener or an explicit workflow fallback. Native Tab/Shift+Tab, nested modals, disabled/hidden controls, and teardown require browser checks; synthetic Tab events do not establish focus behavior.

### Additional chart and batch invariants

Predictor alignment padding must not introduce a break in another history: omit padding from its rendered series while preserving actual saved null/gap observations and duplicate positions. Scope memory retains the previous single-history selection even when that history is hidden in multiple mode; empty histories remain selectable with an explicit empty state.

Mixed Predictor batch deletion validates complete analysis snapshots and removes only selected Predictor GUID references within the same transaction, retaining unselected Weather predictors/readings. Meter bulk deletion validates the complete reviewed meter/reading set and stored identities before any deletion.
