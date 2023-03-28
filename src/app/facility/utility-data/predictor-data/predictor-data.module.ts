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



@NgModule({
  declarations: [
    EditPredictorEntryRowComponent,
    EditPredictorsComponent,
    PredictorDataComponent,
    ManagePredictorsComponent,
    PredictorEntriesComponent,
    PredictorTabsComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgbPaginationModule,
    HelperPipesModule,
    TableItemsDropdownModule,
    RouterModule
  ]
})
export class PredictorDataModule { }
