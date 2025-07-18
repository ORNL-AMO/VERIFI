import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataManagementSidePanelComponent } from './data-management-side-panel.component';
import { DataManagementHelpPanelComponent } from './data-management-help-panel/data-management-help-panel.component';
import { TodoListHelpComponent } from './data-management-help-panel/todo-list-help/todo-list-help.component';
import { SetupChecklistComponent } from './setup-checklist/setup-checklist.component';
import { SharedHelpContentModule } from 'src/app/shared/shared-help-content/shared-help-content.module';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UploadDataHelpModule } from './data-management-help-panel/upload-data-help/upload-data-help.module';
import { DataManagementFacilityHelpComponent } from './data-management-help-panel/data-management-facility-help/data-management-facility-help.component';
import { FacilityListHelpComponent } from './data-management-help-panel/data-management-facility-help/facility-list-help/facility-list-help.component';
import { HelperPipesModule } from 'src/app/shared/helper-pipes/_helper-pipes.module';



@NgModule({
  declarations: [
    DataManagementHelpPanelComponent,
    DataManagementSidePanelComponent,
    TodoListHelpComponent,
    SetupChecklistComponent,
    DataManagementFacilityHelpComponent,
    FacilityListHelpComponent
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
