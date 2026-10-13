import { Component, computed, inject } from '@angular/core';
import { ReportType } from '@data/models/constantsAndTypes';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { AccountAnalysisWorkbenchContext } from '../account-analysis-workbench-context.service';

const REPORT_TYPE_LABELS: Readonly<Record<ReportType, string>> = {
  betterPlants: 'Better Plants',
  dataOverview: 'Data Overview',
  performance: 'Performance',
  betterClimate: 'Better Climate',
  analysis: 'Analysis',
  accountEmissionFactors: 'Account Emission Factors',
  accountSavings: 'Account Savings'
};

@Component({
  selector: 'app-account-analysis-used-by',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './account-analysis-used-by.component.html',
  styleUrls: ['./account-analysis-used-by.component.css']
})
export class AccountAnalysisUsedByComponent {
  readonly context = inject(AccountAnalysisWorkbenchContext);
  readonly reports = computed(() => this.context.linkedReports().map(report => ({
    guid: report.guid,
    name: report.name || 'Untitled account report',
    typeLabel: REPORT_TYPE_LABELS[report.reportType] || 'Account report'
  })));
}
