import { NgModule } from '@angular/core';
import { LibraryModule } from './library/library.module';
import { WorkbenchModule } from './workbench/workbench.module';
import { UtilitySourceProvider } from './utility/utility-source-provider.service';
import { UtilityDataSession } from './utility/utility-data-session.service';
import { UtilityDateContextResolver } from './utility/utility-date-context.service';
import { VISUALIZATION_DATE_CONTEXT_RESOLVER, VISUALIZATION_SOURCE_PROVIDERS, VISUALIZATION_PREVIEW_PRESENTERS } from './preview/preview-registry';
import { TimeSeriesPresenter } from './time-series/time-series.presenter';

@NgModule({ imports: [LibraryModule, WorkbenchModule], providers: [UtilitySourceProvider, UtilityDataSession, UtilityDateContextResolver, TimeSeriesPresenter,
  { provide: VISUALIZATION_SOURCE_PROVIDERS, multi: true, useExisting: UtilitySourceProvider },
  { provide: VISUALIZATION_PREVIEW_PRESENTERS, multi: true, useExisting: TimeSeriesPresenter },
  { provide: VISUALIZATION_DATE_CONTEXT_RESOLVER, useExisting: UtilityDateContextResolver }
] })
export class VisualizationsModule { }
