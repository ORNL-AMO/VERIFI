import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExcelDataTableComponent } from './excel-data-table/excel-data-table.component';
import { ColumnsWizardComponent } from './excel-wizard/columns-wizard/columns-wizard.component';
import { SetupDataWizardComponent } from './excel-wizard/setup-data-wizard/setup-data-wizard.component';
import { WizardDataSummaryComponent } from './excel-wizard/wizard-data-summary/wizard-data-summary.component';
import { WorksheetDataTableComponent } from './excel-wizard/worksheet-data-table/worksheet-data-table.component';
import { ExcelWizardComponent } from './excel-wizard/excel-wizard.component';
import { InvalidMeterDataTableComponent } from './import-meter-data-wizard/invalid-meter-data-table/invalid-meter-data-table.component';
import { MissingMeterNumberTableComponent } from './import-meter-data-wizard/missing-meter-number-table/missing-meter-number-table.component';
import { ValidDataTableComponent } from './import-meter-data-wizard/valid-data-table/valid-data-table.component';
import { ImportMeterDataWizardComponent } from './import-meter-data-wizard/import-meter-data-wizard.component';
import { ImportMeterWizardComponent } from './import-meter-wizard/import-meter-wizard.component';
import { ImportPredictorsTableComponent } from './import-predictors-table/import-predictors-table.component';
import { ImportPredictorsWizardComponent } from './import-predictors-wizard/import-predictors-wizard.component';
import { MeterDataTableComponent } from './meter-data-table/meter-data-table.component';
import { MeterTableComponent } from './meter-table/meter-table.component';
import { UploadDataComponent } from './upload-data.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { EditMeterFormModule } from '../energy-consumption/energy-source/edit-meter-form/edit-meter-form.module';



@NgModule({
  declarations: [
    ExcelDataTableComponent,
    ColumnsWizardComponent,
    SetupDataWizardComponent,
    WizardDataSummaryComponent,
    WorksheetDataTableComponent,
    ExcelWizardComponent,
    InvalidMeterDataTableComponent,
    MissingMeterNumberTableComponent,
    ValidDataTableComponent,
    ImportMeterDataWizardComponent,
    ImportMeterWizardComponent,
    ImportPredictorsTableComponent,
    ImportPredictorsWizardComponent,
    MeterDataTableComponent,
    MeterTableComponent,
    UploadDataComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    DragDropModule,
    EditMeterFormModule
  ]
})
export class UploadDataModule { }
