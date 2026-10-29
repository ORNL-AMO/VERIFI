import { NgModule } from '@angular/core';
import { PredictorsInventoryComponent } from './inventory/predictors-inventory.component';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IconsModule } from '@app/v1/shared/icons/icons.module';
import { DataEmptyStateModule } from '@app/v1/shared/data-empty-state/data-empty-state.module';
import { InventoryGridComponent } from '@app/v1/shared/inventory/inventory-grid/inventory-grid.component';
import { PageIdentityComponent } from '@app/v1/shared/page-identity/page-identity.component';
import { BrowseHeaderDirective } from '@app/v1/shared/navigation/browse-header/browse-header.directive';
import { BrowsePositionDirective } from '@app/v1/shared/navigation/browse-state/browse-position.directive';
import { WorkspaceSlideoutComponent } from '@app/v1/shared/workspace-slideout/workspace-slideout.component';
import { ModalFocusTrapDirective } from '@app/v1/shared/a11y/modal-focus-trap.directive';
import { PredictorWorkbenchComponent } from './predictor-workbench/predictor-workbench.component';
import { PredictorWorkbenchSettingsComponent } from './predictor-workbench/settings/predictor-workbench-settings.component';
import { PredictorWorkbenchReadingsComponent } from './predictor-workbench/readings/predictor-workbench-readings.component';
import { PredictorWorkbenchQualityReportComponent } from './predictor-workbench/quality-report/predictor-workbench-quality-report.component';
import { WeatherPredictorWorkbenchComponent } from './weather-predictor-workbench/weather-predictor-workbench.component';
import { WeatherPredictorSetupComponent } from './weather-predictor-workbench/setup/weather-predictor-setup.component';
import { WeatherPredictorReadingsComponent } from './weather-predictor-workbench/readings/weather-predictor-readings.component';
import { WeatherPredictorQualityComponent } from './weather-predictor-workbench/quality/weather-predictor-quality.component';
import { InventoryToolsComponent } from '@app/v1/data/inventory/inventory-tools/inventory-tools.component';
import { InventoryActionsComponent } from '@app/v1/data/inventory/inventory-actions/inventory-actions.component';
import { CreatePredictorDrawerComponent } from './create-predictor-drawer/create-predictor-drawer.component';

@NgModule({
  declarations: [
    PredictorsInventoryComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    IconsModule,
    DataEmptyStateModule,
    InventoryGridComponent,
    PageIdentityComponent,
    BrowseHeaderDirective,
    BrowsePositionDirective,
    WorkspaceSlideoutComponent,
    ModalFocusTrapDirective,
    PredictorWorkbenchComponent,
    PredictorWorkbenchSettingsComponent,
    PredictorWorkbenchReadingsComponent,
    PredictorWorkbenchQualityReportComponent,
    WeatherPredictorWorkbenchComponent,
    WeatherPredictorSetupComponent,
    WeatherPredictorReadingsComponent,
    WeatherPredictorQualityComponent,
    InventoryToolsComponent,
    InventoryActionsComponent,
    CreatePredictorDrawerComponent
  ],
  exports: [
    PredictorsInventoryComponent,
    CreatePredictorDrawerComponent,
    PredictorWorkbenchComponent
  ],
})
export class PredictorsModule {}
