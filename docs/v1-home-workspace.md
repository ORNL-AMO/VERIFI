# V1 Home workspace

Current Home navigation and dashboard editing contract for [Home3 #2914](https://github.com/ORNL-AMO/VERIFI/issues/2914). The [specification](v1-home-dashboard-spec.md) owns accepted design; [persistence](v1-home-persistence.md) owns durable records, commands and compatibility. Complete recipes/initialization remain Home6. Linked numerical rendering and supporting data widgets remain Home4/Home5.

## Navigation and available templates

Home uses explicit account/facility dashboard identities in `home/dashboard/:dashboardGuid`. Default entry resolves once to an explicit URL so a later preference change cannot replace an open editor. Owners have independent sets, order and selected defaults; visible-order fallback never rewrites unavailable preferences. Missing, hidden and foreign dashboard URLs show recovery. A valid flagged single-facility account exposes only its sole facility set, without hidden analysis-pair initialization. Invalid configurations and stale account routes retain recovery.

The recipe catalog exposes Blank plus only provider-declared complete recipes. Template create/restore consume their complete blueprints; they do not construct partial starters. The initialization hook returns a set only when all six complete recipes exist, and entry never calls it. Opening an empty owner remains read-only, including initialized-empty sets. Imported nonempty sets without an initialized marker offer explicit adoption through the existing atomic command; adoption adds no dashboard or chart.

## Dashboard editing and recovery

Create, rename, duplicate, selected default, visible order, delete and template restore use typed `HomeCommands`. Draft forms and proposals are session-only and keyed by account/owner/dashboard. Editing captures saved dashboard/owner revisions. An active editor prevents account publication or dashboard/owner/route transitions until the user resolves its draft. Browser unload protection is conditional. Confirmation answers are bound to the draft revision; newer input cancels an obsolete answer.

Saving locks the submitted proposal. Rejected writes retain that exact proposal for retry, or permit deliberate draft review before preparing another proposal. Conflicts require loading and reviewing saved state; keeping a local edit explicitly adopts the reviewed revisions without silently changing owners. Removing a dashboard/widget preserves linked charts and source data. Duplication copies independent layout/settings/widget identities while retaining chart links.

Restore confirms the named dashboard and owner, replacement of name/layout/widgets/saved defaults, preservation of identity/sidebar/default/visibility choices, creation of fresh recipe definitions, and retention of former charts. Routed confirmations use the shared modal portal and confirmation dialog, including canceled-dialog focus restoration.

A committed publication failure retains its receipt across departure. Pending saved changes have an account-local recovery inbox, independent of the active owner/dashboard URL, so first creation/default redirects, deletion and hidden destinations cannot strand receipts. Recovery calls `HomeCommands.recover` and never submits a mutation again or navigates to a departed selection. Rejected drafts and receipts are not durable journals; browser reload protection cannot guarantee recovery after an unconfirmed process termination.

## Presentation boundary

Known unavailable widget references and unsupported formats retain truthful placeholders; a coincident imported GUID does not verify blocked intent. Notes remain plain text. Home does not request widget calculations, embed charts, resolve reporting bindings, repair chart sources, or advertise overview-report creation. Home3 exposes note, existing saved-visualization and typed internal-shortcut additions. All supported persisted widget variants retain title, Half/Full size, order, settings and truthful states; later data widget renderers are not advertised as available additions.

## Widget drafts, layout and accessibility

Widget title, plain note text, typed shortcut choice, order and Half/Full size participate in the dashboard's protected draft. Add/remove never writes a saved visualization. Linked additions start with dashboard inheritance off and preserve source scope/settings. Duplication retains the same chart links while allocating independent widget/layout identities. Explicit shortcut selection may acknowledge only that widget's reviewed blocked paths; rename, movement and sizing never acknowledge references. Unfinished add-widget target choices survive workspace reload and block saving until added or cleared.

Every widget has labeled Move earlier/Move later and Half/Full controls alongside pointer handles. Removal confirms draft-only consequences and preserves saved charts/source data; focus moves to the next widget or Add widget. Creation focuses the new editor, movement focuses its heading, and canceled confirmations restore the opener after the routed workspace becomes interactive.

Array order drives DOM, reading, keyboard and grid order. Sparse row placement never backfills gaps or visually repacks the sequence. Two columns require at least `52rem + 4px` of container width, leaving each Half widget 24rem of content after padding and borders; otherwise every widget stacks. Controls wrap, long names/text break safely, and workbench borders connect with square outer corners and no vertical gaps. The main dashboard-order links remain available when the sidebar is collapsed.

Print switches to committed widget order/content and the committed dashboard name, in one column, without changing the retained editing draft. Editing/navigation controls are omitted; notes, shortcut labels and truthful deferred/unavailable states remain readable.
