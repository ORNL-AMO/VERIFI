import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataManagementSidePanelComponent } from './data-management-side-panel.component';
import { DataManagementHelpPanelComponent } from './data-management-help-panel/data-management-help-panel.component';
import { TodoListHelpComponent } from './data-management-help-panel/todo-list-help/todo-list-help.component';
import { SetupChecklistComponent } from './setup-checklist/setup-checklist.component';
import { SharedHelpContentModule } from 'src/app/shared/shared-help-content/shared-help-content.module';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';



@NgModule({
  declarations: [
    DataManagementHelpPanelComponent,
    DataManagementSidePanelComponent,
    TodoListHelpComponent,
    SetupChecklistComponent
  ],
  imports: [
    CommonModule,
    SharedHelpContentModule,
    RouterModule,
    FormsModule
  ],
  exports: [
    DataManagementSidePanelComponent
  ]
})
export class DataManagementSidePanelModule { }
