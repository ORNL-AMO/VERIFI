# Custom UI icons

Use `app-ui-icon` for both Hugeicons and custom icons. Register semantic names in
[`icon-registry.ts`](icon-registry.ts); consumers do not choose a renderer.

To add a custom icon:

1. Keep its reviewed 24 × 24 SVG design source in `src/assets/icons/`.
2. Add a typed `IconSvgObject` definition in [`custom-icons.ts`](custom-icons.ts).
   Copy geometry and inherited SVG attributes onto the individual elements.
   Use `currentColor` for themed strokes/fills. The existing renderer supports
   paths, circles, ellipses, rectangles, lines, polylines, and polygons; flatten
   transforms/groups in the source before registering an icon.
   Custom icons preserve their declared element stroke widths by default; an
   explicit `strokeWidth` input overrides all elements.
3. Export a semantic entry through `CUSTOM_ICONS`. Its keys automatically join
   `IconName` alongside the Hugeicons registry entries.
4. Test the rendered geometry against the asset and verify sizing, stroke width,
   and accessible labeling. Keep the asset and definition synchronized.

Example: `<app-ui-icon name="dataVisualization" [size]="20" />`.
Icons are decorative by default. For a meaningful standalone icon, set
`[decorative]="false"` and supply `label`; labeled buttons normally keep their
icons decorative.

## Visualization icons

The [chart catalog](../../visualizations/visualization-charts.ts) owns the mapping
used by Dashboard cards, creation choices, and pinned chart selections. Use
`chartTimeSeries` (`ChartLineData02Icon`) for Line, Area, Combination, and trend
recipes; `chartBar` (`ChartColumnIncreasingIcon`) for both bar choices;
`chartScatter` (`ChartScatterIcon`) for Scatter; `covariate` (`CovariateIcon`) for
Correlation; and `chartDonut` (`DoughnutIcon`) for Donut. Definitions without a
recognized chart retain the generic `dataVisualization` icon.

Use `name="heatmap"` for the regular grid with varying cell intensity, and
`name="treemap"` for unequal, nested rectangular areas. Their design sources are
[`heatmap.svg`](../../../../assets/icons/heatmap.svg) and
[`treemap.svg`](../../../../assets/icons/treemap.svg). Both use `currentColor`
with translucent fills so the intensity differences follow the surrounding theme.

Use `name="sankey"` for weighted flow ribbons branching from a source to multiple
destinations. Its source is [`sankey.svg`](../../../../assets/icons/sankey.svg).

## Energy-use icons

Use `name="pump"` for the open-center pump and `name="fan"` for the scroll fan
with curved impeller details. Their reviewed design sources are
[`pump.svg`](../../../../assets/icons/pump.svg) and
[`fan.svg`](../../../../assets/icons/fan.svg). Both inherit the surrounding text
color; the fan preserves its finer impeller strokes unless `strokeWidth` is set.

Use `name="processHeating"` and `name="processCooling"` for the paired flow
symbols: a flame or snowflake with three flowing arrows. Their sources are
[`process-heating.svg`](../../../../assets/icons/process-heating.svg) and
[`process-cooling.svg`](../../../../assets/icons/process-cooling.svg).

Use `name="steam"` for the boiler cutaway with waterline, flame, and steam
outlet. Its source is [`steam.svg`](../../../../assets/icons/steam.svg); the
finer interior strokes are preserved unless `strokeWidth` is set.

Use `name="compressedAir"` for the compressor assembly with a receiver tank,
upper unit, pressure gauge, and hose. Its source is
[`compressed-air.svg`](../../../../assets/icons/compressed-air.svg).

Use `name="energyUseGroup"` for a collection of energy-use items. Its source is
[`energy-use-group.svg`](../../../../assets/icons/energy-use-group.svg), with
collection brackets surrounding a circle, flame, snowflake, and hexagonal
equipment symbol to distinguish mixed membership from an individual item. Use it for existing/new group choices and pinned group selections in the Add energy use slideout.

Use `name="motor"` for the cylinder motor with rounded end caps, cooling fins,
and shaft. Its source is [`motor.svg`](../../../../assets/icons/motor.svg).

For energy-footprint tabs, use `name="groupEnergyFootprint"` for one lightning
footprint inside the group collection brackets, and `name="facilityEnergyFootprint"`
for two footprints containing a lightning bolt and a flame. Their design sources
are [`group-energy-footprint.svg`](../../../../assets/icons/group-energy-footprint.svg)
and [`facility-energy-footprint.svg`](../../../../assets/icons/facility-energy-footprint.svg).

## Report icons

Register each custom report icon above, then add its semantic name to the account
or facility definition in the [report catalog](../../reports/catalog/report-catalog.ts). For example,
the Better Plants account report uses `betterPlantsReport`, whose source is
[`better-plants-report.svg`](../../../../assets/icons/better-plants-report.svg).
Account and facility mappings are separate because some report type names overlap.
The facility analysis report uses `facilityAnalysisReport`, combining that same
page outline with the analysis microscope in
[`facility-analysis-report.svg`](../../../../assets/icons/facility-analysis-report.svg).

Use `reportIcon(report)` when preparing report cards, sidebar entries, switcher
options, linked-report rows, or workflow stages. It returns the current `report`
page icon when the report has no custom icon, its saved type is unrecognized, or
the report is unavailable. Workbench headers use the selected switcher option's
icon. Keep report-icon selection in this shared lookup rather than adding local
type switches or storing icon names on report records.

Use `energyUseIcon(category)` from the Energy Uses models for item cards, group type icons, sidebar links, workbench identity, and switcher options. HVAC, Lighting, and Mobile map to AirVentIcon, LampCeilingIcon, and ForkliftIcon; Other and unknown imported categories use UfoIcon. Icons are derived presentation and are never saved onto equipment records.
