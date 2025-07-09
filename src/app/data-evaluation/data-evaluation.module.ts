import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataEvaluationComponent } from './data-evaluation.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { RouterModule } from '@angular/router';
import { HelperPipesModule } from '../shared/helper-pipes/_helper-pipes.module';
import { FacilityListPipe } from './sidebar/facility-list.pipe';
import { HelpPanelModule } from './help-panel/help-panel.module';



@NgModule({
  declarations: [
    DataEvaluationComponent,
    SidebarComponent,
    FacilityListPipe
  ],
  imports: [
    CommonModule,
    RouterModule,
    HelperPipesModule,
    HelpPanelModule
  ]
})
export class DataEvaluationModule { }
