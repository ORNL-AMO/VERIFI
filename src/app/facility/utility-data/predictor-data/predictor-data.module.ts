import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EditPredictorEntryRowComponent } from './edit-predictor-entry-row/edit-predictor-entry-row.component';
import { EditPredictorsComponent } from './edit-predictors/edit-predictors.component';
import { PredictorDataComponent } from './predictor-data.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { HelperPipesModule } from 'src/app/shared/helper-pipes/helper-pipes.module';
import { TableItemsDropdownModule } from 'src/app/shared/table-items-dropdown/table-items-dropdown.module';
import { ManagePredictorsComponent } from './manage-predictors/manage-predictors.component';
import { RouterModule } from '@angular/router';
import { PredictorEntriesComponent } from './predictor-entries/predictor-entries.component';
import { PredictorTabsComponent } from './predictor-tabs/predictor-tabs.component';
import { EditPredictorComponent } from './manage-predictors/edit-predictor/edit-predictor.component';
import { EditPredictorEntryComponent } from './edit-predictor-entry/edit-predictor-entry.component';
import { PredictorsTableComponent } from './manage-predictors/predictors-table/predictors-table.component';
import { LabelWithTooltipModule } from 'src/app/shared/label-with-tooltip/label-with-tooltip.module';



@NgModule({
  declarations: [
    EditPredictorEntryRowComponent,
    EditPredictorsComponent,
    PredictorDataComponent,
    ManagePredictorsComponent,
    PredictorEntriesComponent,
    PredictorTabsComponent,
    EditPredictorComponent,
    EditPredictorEntryComponent,
    PredictorsTableComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgbPaginationModule,
    HelperPipesModule,
    TableItemsDropdownModule,
    RouterModule,
    LabelWithTooltipModule
  ]
})
export class PredictorDataModule { }
