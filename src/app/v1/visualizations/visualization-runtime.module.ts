import { CompositionModule } from './composition/composition.module';
import { BreakdownPresenter, TreemapPresenter, SunburstPresenter, SankeyPresenter } from './composition/composition.presenter';
import { ExplorationModule } from './exploration/exploration.module';
import { CorrelationPresenter, ScatterPresenter, HeatmapPresenter } from './exploration/exploration.presenter';
import { AnalysisDataSession } from './analysis/analysis-data-session.service';
import { AnalysisSourceProvider } from './analysis/analysis-source-provider.service';
import { EquipmentSourceProvider } from './energy-use/equipment-source-provider.service';
import { PredictorSourceProvider } from './predictor/predictor-source-provider.service';
import { NgModule } from '@angular/core';
import { UtilitySourceProvider } from './utility/utility-source-provider.service';
import { UtilityDataSession } from './utility/utility-data-session.service';
import { VisualizationDateContextResolver } from './preview/visualization-date-context.service';
import { VISUALIZATION_DATE_CONTEXT_RESOLVER, VISUALIZATION_SOURCE_PROVIDERS, VISUALIZATION_PREVIEW_PRESENTERS } from './preview/preview-registry';
import { TimeSeriesPresenter } from './time-series/time-series.presenter';
import { MonthlyPatternsPresenter } from './monthly-patterns/monthly-patterns.presenter';
import { TimeSeriesModule } from './time-series/time-series.module';

@NgModule({ imports: [TimeSeriesModule, CompositionModule, ExplorationModule], providers: [MonthlyPatternsPresenter, BreakdownPresenter, TreemapPresenter, SunburstPresenter, SankeyPresenter, CorrelationPresenter, ScatterPresenter, HeatmapPresenter, AnalysisDataSession, AnalysisSourceProvider, EquipmentSourceProvider, PredictorSourceProvider, UtilitySourceProvider, UtilityDataSession, VisualizationDateContextResolver, TimeSeriesPresenter,
  { provide: VISUALIZATION_PREVIEW_PRESENTERS, multi: true, useExisting: MonthlyPatternsPresenter },
  { provide: VISUALIZATION_SOURCE_PROVIDERS, multi: true, useExisting: UtilitySourceProvider },
  { provide: VISUALIZATION_SOURCE_PROVIDERS, multi: true, useExisting: PredictorSourceProvider },
  { provide: VISUALIZATION_SOURCE_PROVIDERS, multi: true, useExisting: EquipmentSourceProvider },
  { provide: VISUALIZATION_SOURCE_PROVIDERS, multi: true, useExisting: AnalysisSourceProvider },
  { provide: VISUALIZATION_PREVIEW_PRESENTERS, multi: true, useExisting: TimeSeriesPresenter },
  { provide: VISUALIZATION_PREVIEW_PRESENTERS, multi: true, useExisting: CorrelationPresenter },
  { provide: VISUALIZATION_PREVIEW_PRESENTERS, multi: true, useExisting: ScatterPresenter },
  { provide: VISUALIZATION_PREVIEW_PRESENTERS, multi: true, useExisting: HeatmapPresenter },
  { provide: VISUALIZATION_PREVIEW_PRESENTERS, multi: true, useExisting: BreakdownPresenter },
  { provide: VISUALIZATION_PREVIEW_PRESENTERS, multi: true, useExisting: TreemapPresenter },
  { provide: VISUALIZATION_PREVIEW_PRESENTERS, multi: true, useExisting: SunburstPresenter },
  { provide: VISUALIZATION_PREVIEW_PRESENTERS, multi: true, useExisting: SankeyPresenter },
  { provide: VISUALIZATION_DATE_CONTEXT_RESOLVER, useExisting: VisualizationDateContextResolver }
] })
export class VisualizationRuntimeModule { }
