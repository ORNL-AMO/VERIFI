import { CommonModule } from '@angular/common';
import { NgModule, Pipe, PipeTransform } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AccountAnalysisComponent } from './account-analysis.component';
import { AccountAnalysisBannerComponent } from './account-analysis-banner/account-analysis-banner.component';
import { AccountAnalysisFooterComponent } from './account-analysis-footer/account-analysis-footer.component';
import { AccountAnalysisSetupComponent } from './account-analysis-setup/account-analysis-setup.component';
import { SelectFacilityAnalysisItemsComponent } from './select-facility-analysis-items/select-facility-analysis-items.component';
import { SelectItemTableComponent } from './select-facility-analysis-items/select-item-table/select-item-table.component';

@Pipe({ name: 'invalidAnalysis', standalone: false })
export class AccountAnalysisInvalidStubPipe implements PipeTransform {
  transform(_value: string) { return { hasError: false, groupsHaveErrors: false }; }
}

@Pipe({ name: 'groupName', standalone: false })
export class AccountAnalysisGroupNameStubPipe implements PipeTransform {
  transform(value: string) { return value; }
}

@Pipe({ name: 'yearDisplay', standalone: false })
export class AccountAnalysisYearDisplayStubPipe implements PipeTransform {
  transform(value: number, _fiscalYear: unknown) { return value; }
}

@NgModule({
  declarations: [AccountAnalysisComponent, AccountAnalysisBannerComponent, AccountAnalysisFooterComponent,
    AccountAnalysisSetupComponent, SelectFacilityAnalysisItemsComponent, SelectItemTableComponent,
    AccountAnalysisInvalidStubPipe, AccountAnalysisGroupNameStubPipe, AccountAnalysisYearDisplayStubPipe],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  exports: [AccountAnalysisComponent, AccountAnalysisBannerComponent, AccountAnalysisFooterComponent,
    AccountAnalysisSetupComponent, SelectFacilityAnalysisItemsComponent, SelectItemTableComponent]
})
export class AccountAnalysisTestingModule { }
