import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContributionHeatmapComponent } from '@app/v1/shared/analysis-results/contribution-heatmap/contribution-heatmap.component';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { AnalysisResultNumberPipe } from '@app/v1/shared/analysis-results/number/analysis-result-number.pipe';
import { AnalysisResultStatusComponent } from '@app/v1/shared/analysis-results/status/analysis-result-status.component';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { AccountAnalysisWorkbenchContext } from '../../account-analysis-workbench-context.service';
import {
  ACCOUNT_ANALYSIS_ORIGIN_QUERY,
  AccountAnalysisFacilitySelectionService
} from '../../select-facility-items/account-analysis-facility-selection.service';
import { AccountAnalysisResultsService } from '../calculation/account-analysis-results.service';
import {
  AccountFacilityContributionsView,
  accountFacilityContributionsView
} from '../presentation/account-analysis-facility-results.view';

@Component({
  selector: 'app-account-analysis-facility-contributions',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ContributionHeatmapComponent,
    IconComponent,
    AnalysisResultNumberPipe,
    AnalysisResultStatusComponent
  ],
  templateUrl: './account-analysis-facility-contributions.component.html',
  styleUrls: ['./account-analysis-facility-contributions.component.css']
})
export class AccountAnalysisFacilityContributionsComponent {
  readonly context = inject(AccountAnalysisWorkbenchContext);
  readonly selection = inject(AccountAnalysisFacilitySelectionService);
  readonly results = inject(AccountAnalysisResultsService);
  private readonly navigation = inject(WorkspaceNavigationService);
  readonly blocking = computed(() => this.context.hasBlockingErrors() || !this.selection.resultsReady());
  readonly rows = computed(() => {
    const state = this.results.state();
    return state.state === 'ready' ? state.annual : [];
  });
  readonly unit = computed(() => this.context.analysis()?.analysisCategory === 'water'
    ? this.context.analysis()?.waterUnit
    : this.context.analysis()?.energyUnit);
  readonly view = computed(() => {
    const state = this.results.state();
    const names = new Map(this.context.facilities().map(facility => [facility.guid, facility.name]));
    return state.state === 'ready'
      ? accountFacilityContributionsView(state.annual, state.facilitySummaries, names)
      : EMPTY_VIEW;
  });
  readonly drillInLinks = computed(() => {
    const account = this.context.account();
    const analysis = this.context.analysis();
    if (!account || !analysis) return {} as Readonly<Record<string, FacilityGroupContributionsLink>>;
    return Object.fromEntries(this.view().facilities.map(facility => [
      facility.facilityGuid,
      {
        route: this.navigation.facilityAnalysisResultsRoute(facility.facilityGuid, facility.analysisGuid, 'group-contributions'),
        queryParams: {
          [ACCOUNT_ANALYSIS_ORIGIN_QUERY.accountGuid]: account.guid,
          [ACCOUNT_ANALYSIS_ORIGIN_QUERY.analysisGuid]: analysis.guid,
          [ACCOUNT_ANALYSIS_ORIGIN_QUERY.facilityGuid]: facility.facilityGuid,
          [ACCOUNT_ANALYSIS_ORIGIN_QUERY.resultTab]: 'facility-contributions'
        }
      }
    ]));
  });
  readonly hasContributionData = computed(() => this.view().facilities.length > 0 && this.view().years.length > 0);
  readonly heatmapView = computed(() => ({
    labels: this.view().facilities.map(item => item.facilityName),
    years: this.view().years.map(year => ({
      year: year.year,
      totalContributionPercent: year.totalContributionPercent,
      contributions: year.facilities.map(item => item.contributionPercent)
    }))
  }));
}

const EMPTY_VIEW: AccountFacilityContributionsView = { facilities: [], years: [] };

interface FacilityGroupContributionsLink {
  readonly route: readonly string[];
  readonly queryParams: Readonly<Record<string, string>>;
}
