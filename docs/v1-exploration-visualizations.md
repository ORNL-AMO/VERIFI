# V1 correlation and heatmap exploration

This reference owns saved VIS7 chart behavior. [Foundation](v1-visualization-foundation.md) owns source meaning, [workbench](v1-visualization-workbench.md) owns editing/recovery, and [persistence](v1-visualization-persistence.md) owns durable ownership and transfer.

## Saved settings and supported sources

Scatter, Correlation and Heatmap reuse source selections, period settings, item labels/visibility/order, and the existing preview registry. Optional settings extend the current definition format without hydration writes or a database/envelope version change. Omitted interval means monthly; omitted correlation view means pairwise plots, omitted fit means visible, and omitted grouping/normalization means none/raw. New Energy Use-only exploration explicitly starts yearly with all history; its Heatmap uses Series by time. New scatter retains its explicit fit setting.

Calendarized utilities support their existing monthly/yearly measures and conversions; predictors retain saved Standard/Weather monthly observations; named facility/account analysis results retain their supported monthly/yearly measures and readiness; Energy Uses retain annual consumption projections. Monthly exploration can combine utilities, predictors and results. Annual exploration can combine utility/result/equipment histories only when actual periods match. Source-specific calculation, grouping, fiscal, ownership and missing-reference restrictions still apply.

One observation interval applies throughout a figure. Monthly alignment uses the same civil month, and annual alignment uses actual inclusive start/end dates. Different overlapping annual intervals are incompatible even if fiscal-year labels match. Native bills/charges, model inspection, comparison overlays and resampling annual estimates into months are unavailable. Viewing never retrieves weather or writes source history.

Scatter axes select an individual expanded series using a source-qualified resource GUID or provider category identity. Resource-bearing category identities participate in verified reference mapping. Existing declaration-ID axes resolve only when unambiguous. Missing bindings remain explicit repairable intent; labels never retarget identity.

## Correlation and scatter

Correlation displays every unique pair of visible selected series exactly once. Saved series order determines panel order and X-before-Y orientation. All panels share one saved visualization, title and settings. When more than one facility is included, source labels include their facility names, including sources with otherwise distinct names. Labels never append internal source/metric identifiers or resource GUIDs. Single-facility labels omit facility context, and unspecified units are blank. The grid has two columns when space permits and one on narrow layouts; chart options and canvases initialize on demand as panels become visible. Printing initializes every panel and includes them in reading order.

Each pair independently includes only finite, observed, complete values. Missing, excluded, partial and out-of-history observations remain available with omission reasons. A missing third series cannot change another pair's sample. Available points remain plotted when the minimum three complete observations or nonconstant-series requirement prevents statistics.

The pure shared exploratory helper computes signed Pearson r and ordinary least squares with an intercept, preserving the existing Analysis exploration arithmetic. Pair panels center their title, summary and equation. Summaries show signed r and R² without paired-count or excluded-count notes. Fit equations use source names in place of X/Y and omit the Original units prefix. Statistical summaries and equations use original values and units; zoom, grouping and standardization do not change the sample. Fit visibility is saved. Point grouping is None, Calendar year or Month of year; it changes colors without fitting separate groups.

Raw and z-score axes retain original values in tooltips. Population z-scores use each series's complete finite observations over the whole selected period, independently of zoom. Constant/insufficient standardized series retain explained gaps.

Matrix view displays the same pair summaries symmetrically. Signed r uses a fixed −1 to 1 diverging scale; R² uses a fixed 0 to 1 sequential scale. Diagonal values require sufficient varying observations. Cells show coefficients and unavailable reasons in tooltips; undefined coefficients remain unavailable rather than zero.

Preparation yields between batches and honors cancellation. No pair list is truncated: selections exceeding 10,000 pairs or five million pair-period evaluations receive a narrowing explanation before preparation.

## Heatmaps and chart display

Month by year uses months as columns, calendar years as rows, and one independently scaled panel per series. It requires monthly data. Series by time uses series rows and monthly/yearly columns. Raw Series by time requires compatible dimension, units, currency and energy treatment; explicit z-score normalization permits mixed units.

Sequential and zero-centered diverging scales use the whole selected period, independently of the viewport. Each panel labels its scale and units. True zero remains numeric. Missing and out-of-history/out-of-range months stay blank, retain their reasons in tooltips, and never contribute synthetic zeros to the color scale. Sequential bounds use observed values without forcing a zero endpoint; diverging scales remain centered on zero. Excluded cells use ×, unavailable standardized values use —, and partial observed values use *. Raw partial values retain authoritative coverage. Standardized partial values remain gaps.

Charts retain original values, dates, units, quality and provenance in tooltips. The display contains chart panels without pair inspectors, observation tables, reset-zoom buttons or chart-local validation notices. Zoom remains temporary and compatible appearance edits preserve it. Printing includes every chart panel and its title in reading order while omitting editing controls.

The workbench header uses the existing workspace data checks for selected meters and predictors, including live meter-group/rule membership. Checks cover full saved histories, honor shared preferences and dismissals, and open existing source destinations through guarded navigation. Statistical unavailability and missing-cell indicators remain part of each chart's meaning; they do not create separate data-check findings.

## Validation

Deterministic coverage protects unique pair counts/order, independent masks, raw statistical semantics, normalization, interval/units compatibility, missing-cell meaning, source selectors, transfer and cancellation. Chromium journeys exercise actual storage/reopen, account/facility backup remapping, chart rendering, keyboard header actions, themes, narrow windows, printing and source immutability. Focused checks do not substitute for the production-shell/release QA tracked by the [delivery plan](v1-visualizations-and-home-plan.md).
