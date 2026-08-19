import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SustainabilityQuestionsFormComponent } from '@v0/shared/settings-forms/sustainability-questions-form/sustainability-questions-form.component';
import { GeneralInformationFormComponent } from '@v0/shared/settings-forms/general-information-form/general-information-form.component';
import { FinancialReportingFormComponent } from '@v0/shared/settings-forms/financial-reporting-form/financial-reporting-form.component';
import { DefaultUnitsFormComponent } from '@v0/shared/settings-forms/default-units-form/default-units-form.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HelperPipesModule } from '@shared/helper-pipes/_helper-pipes.module';
import { LabelWithTooltipModule } from '@shared/label-with-tooltip/label-with-tooltip.module';
import { EGridEmissionsTableComponent } from '@v0/shared/settings-forms/default-units-form/e-grid-emissions-table/e-grid-emissions-table.component';
import { DataStalenessSettingsFormComponent } from '@v0/shared/settings-forms/data-staleness-settings-form/data-staleness-settings-form.component';



@NgModule({
  declarations: [
    SustainabilityQuestionsFormComponent,
    GeneralInformationFormComponent,
    FinancialReportingFormComponent,
    DefaultUnitsFormComponent,
    EGridEmissionsTableComponent,
    DataStalenessSettingsFormComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    HelperPipesModule,
    LabelWithTooltipModule
  ],
  exports: [
    SustainabilityQuestionsFormComponent,
    GeneralInformationFormComponent,
    FinancialReportingFormComponent,
    DefaultUnitsFormComponent,
    DataStalenessSettingsFormComponent
  ]
})
export class SettingsFormsModule { }
