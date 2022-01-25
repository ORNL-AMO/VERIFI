import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccountComponent } from './account/account.component';
import { DefaultUnitsFormComponent } from './default-units-form/default-units-form.component';
import { FacilityComponent } from './facility/facility.component';
import { FinancialReportingFormComponent } from './financial-reporting-form/financial-reporting-form.component';
import { GeneralInformationFormComponent } from './general-information-form/general-information-form.component';
import { SustainabilityQuestionsFormComponent } from './sustainability-questions-form/sustainability-questions-form.component';



@NgModule({
  declarations: [
    AccountComponent,
    DefaultUnitsFormComponent,
    FacilityComponent,
    FinancialReportingFormComponent,
    GeneralInformationFormComponent,
    SustainabilityQuestionsFormComponent
  ],
  imports: [
    CommonModule
  ]
})
export class AccountManagementModule { }
