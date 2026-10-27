import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { ReportAnalysisReturnService } from '@app/v1/shared/reports/report-analysis-return.service';
import { RouterLink } from '@angular/router';
import { MeterResultsChartComponent } from '@app/v1/shared/charts/metric-results-chart/meter-results-chart.component';
import { AnalysisResultStatusComponent } from '@app/v1/shared/analysis-results/status/analysis-result-status.component';
import { AnalysisResultNumberPipe } from '@app/v1/shared/analysis-results/number/analysis-result-number.pipe';
import { monthlyUseChartMetrics, monthlyUseChartRows } from '@app/v1/shared/analysis-results/chart/analysis-result-chart.view';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { AccountAnalysisWorkbenchContext } from '../../account-analysis-workbench-context.service';
import {
  ACCOUNT_ANALYSIS_ORIGIN_QUERY,
  AccountAnalysisFacilitySelectionService
} from '../../select-facility-items/account-analysis-facility-selection.service';
import { AccountAnalysisResultsService } from '../calculation/account-analysis-results.service';
import { accountFacilityDetailsView } from '../presentation/account-analysis-facility-results.view';

@Component({
  selector: 'app-account-analysis-facility-details',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MeterResultsChartComponent,
    AnalysisResultStatusComponent,
    AnalysisResultNumberPipe,
    IconComponent
  ],
  templateUrl: './account-analysis-facility-details.component.html',
  styleUrls: ['./account-analysis-facility-details.component.css']
})
export class AccountAnalysisFacilityDetailsComponent {
  readonly context = inject(AccountAnalysisWorkbenchContext);
  readonly selection = inject(AccountAnalysisFacilitySelectionService);
  readonly results = inject(AccountAnalysisResultsService);
  private readonly navigation = inject(WorkspaceNavigationService);
  private readonly reportReturn = inject(ReportAnalysisReturnService, { optional: true });
  readonly blocking = computed(() => this.context.hasBlockingErrors() || !this.selection.resultsReady());
  readonly category = computed(() => this.context.analysis()?.analysisCategory);
  readonly unit = computed(() => this.category() === 'water' ? this.context.analysis()?.waterUnit : this.context.analysis()?.energyUnit);
  readonly chartMetrics = computed(() => monthlyUseChartMetrics(this.category(), this.unit()));
  readonly facilities = computed(() => {
    const state = this.results.state();
    const names = new Map(this.context.facilities().map(facility => [facility.guid, facility.name]));
    const account = this.context.account();
    const analysis = this.context.analysis();
    return state.state === 'ready'
      ? accountFacilityDetailsView(state.facilitySummaries, names, state.annual).map(facility => ({
        ...facility,
        chartRows: monthlyUseChartRows(facility.monthlyRows),
        drillInRoute: this.navigation.facilityAnalysisWorkbenchRoute(facility.facilityGuid, facility.analysisGuid),
        drillInQueryParams: account && analysis ? {
          ...this.reportReturn?.queryParams(),
          [ACCOUNT_ANALYSIS_ORIGIN_QUERY.accountGuid]: account.guid,
          [ACCOUNT_ANALYSIS_ORIGIN_QUERY.analysisGuid]: analysis.guid,
          [ACCOUNT_ANALYSIS_ORIGIN_QUERY.facilityGuid]: facility.facilityGuid,
          [ACCOUNT_ANALYSIS_ORIGIN_QUERY.resultTab]: 'facility-details'
        } : undefined
      }))
      : [];
  });
}
