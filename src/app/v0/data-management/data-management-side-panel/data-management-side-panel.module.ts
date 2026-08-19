import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataManagementSidePanelComponent } from '@v0/data-management/data-management-side-panel/data-management-side-panel.component';
import { DataManagementHelpPanelComponent } from '@v0/data-management/data-management-side-panel/data-management-help-panel/data-management-help-panel.component';
import { TodoListHelpComponent } from '@v0/data-management/data-management-side-panel/data-management-help-panel/todo-list-help/todo-list-help.component';
import { SetupChecklistComponent } from '@v0/data-management/data-management-side-panel/setup-checklist/setup-checklist.component';
import { SharedHelpContentModule } from '@v0/shared/shared-help-content/shared-help-content.module';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UploadDataHelpModule } from '@v0/data-management/data-management-side-panel/data-management-help-panel/upload-data-help/upload-data-help.module';
import { DataManagementFacilityHelpComponent } from '@v0/data-management/data-management-side-panel/data-management-help-panel/data-management-facility-help/data-management-facility-help.component';
import { FacilityListHelpComponent } from '@v0/data-management/data-management-side-panel/data-management-help-panel/data-management-facility-help/facility-list-help/facility-list-help.component';
import { HelperPipesModule } from '@v0/shared/helper-pipes/_helper-pipes.module';
import { PredictorDataQualityReportHelpComponent } from '@v0/data-management/data-management-side-panel/data-management-help-panel/data-management-facility-help/predictor-data-quality-report-help/predictor-data-quality-report-help.component';
import { MeterDataQualityReportHelpComponent } from '@v0/data-management/data-management-side-panel/data-management-help-panel/data-management-facility-help/meter-data-quality-report-help/meter-data-quality-report-help.component';
import { EnergyFootprintSidePanelComponent } from '@v0/data-management/data-management-side-panel/energy-footprint-side-panel/energy-footprint-side-panel.component';

@NgModule({
  declarations: [
    DataManagementHelpPanelComponent,
    DataManagementSidePanelComponent,
    TodoListHelpComponent,
    SetupChecklistComponent,
    DataManagementFacilityHelpComponent,
    FacilityListHelpComponent,
    PredictorDataQualityReportHelpComponent,
    MeterDataQualityReportHelpComponent,
    EnergyFootprintSidePanelComponent
  ],
  imports: [
    CommonModule,
    SharedHelpContentModule,
    RouterModule,
    FormsModule,
    UploadDataHelpModule,
    HelperPipesModule
],
  exports: [
    DataManagementSidePanelComponent
  ]
})
export class DataManagementSidePanelModule { }
