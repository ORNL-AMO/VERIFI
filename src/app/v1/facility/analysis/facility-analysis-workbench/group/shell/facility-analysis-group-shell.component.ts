import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { FacilityAnalysisWorkbenchContext } from '../../facility-analysis-workbench-context.service';
import { AnalysisWorkbenchTabId, isSkippedAnalysisType } from '../../facility-analysis-workbench.models';
import { FacilityAnalysisGroupContext } from '../facility-analysis-group-context.service';
import { FacilityAnalysisGroupResultsService } from '../results/calculation/facility-analysis-group-results.service';
import { FacilityAnalysisBankingResultsService } from '../banking/facility-analysis-banking-results.service';
import { bankingTabAvailable } from '../../banking/facility-analysis-banking';

@Component({
  selector: 'app-facility-analysis-group-shell',
  standalone: true,
  providers: [FacilityAnalysisGroupContext, FacilityAnalysisGroupResultsService, FacilityAnalysisBankingResultsService],
  imports: [RouterOutlet, IconComponent],
  templateUrl: './facility-analysis-group-shell.component.html',
  styleUrls: ['./facility-analysis-group-shell.component.css']
})
export class FacilityAnalysisGroupShellComponent {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly activeTabState = signal<AnalysisWorkbenchTabId>('setup');
  readonly context = inject(FacilityAnalysisWorkbenchContext);
  readonly groupContext = inject(FacilityAnalysisGroupContext);
  readonly groupGuid = this.groupContext.groupGuid;
  readonly group = this.groupContext.group;
  readonly meterGroup = this.groupContext.meterGroup;
  private readonly canonicalRouteEffect = effect(() => {
    const facility = this.context.facility();
    const analysis = this.groupContext.autosave.draft() || this.context.analysis();
    const group = this.group();
    if (!facility || !analysis || !group) return;
    const tab = this.activeTabState();
    if ((tab === 'regression' && group.analysisType !== 'regression')
      || (tab === 'banking' && !bankingTabAvailable(analysis, group, this.context.analyses(), this.context.status.items()))
      || ((tab === 'annual' || tab === 'monthly-table' || tab === 'monthly-chart') && isSkippedAnalysisType(group.analysisType))) {
      void this.router.navigate([
        '/v1', 'workspace', 'facility', facility.guid, 'analysis', 'workbench', analysis.guid,
        'group', group.idbGroupId, 'setup'
      ], { replaceUrl: true });
    }
  });

  constructor() {
    this.syncActiveTab();
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => this.syncActiveTab());
  }

  private syncActiveTab(): void {
    const segments = this.router.url.split(/[?#]/, 1)[0].split('/');
    const tab = segments[segments.length - 1];
    const activeTab = isAnalysisWorkbenchTab(tab) ? tab : 'setup';
    this.activeTabState.set(activeTab);
  }
}

function isAnalysisWorkbenchTab(value: unknown): value is AnalysisWorkbenchTabId {
  return value === 'setup'
    || value === 'banking'
    || value === 'regression'
    || value === 'annual'
    || value === 'monthly-table'
    || value === 'monthly-chart';
}
