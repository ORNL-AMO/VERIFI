import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { DataWorkbenchTabsComponent } from '@app/v1/shared/data-workbench/data-workbench-tabs.component';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { FacilityAnalysisWorkbenchContext } from '../facility-analysis-workbench-context.service';
import { AnalysisWorkbenchTabId, isSkippedAnalysisType, tabsForAnalysisGroup } from '../facility-analysis-workbench.models';

@Component({
  selector: 'app-facility-analysis-group-shell',
  standalone: true,
  imports: [RouterOutlet, DataWorkbenchTabsComponent, IconComponent],
  templateUrl: './facility-analysis-group-shell.component.html',
  styleUrls: ['./facility-analysis-group-shell.component.css']
})
export class FacilityAnalysisGroupShellComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly params = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });
  private readonly activeTabState = signal<AnalysisWorkbenchTabId>('setup');
  readonly context = inject(FacilityAnalysisWorkbenchContext);
  readonly groupGuid = computed(() => this.params().get('groupGuid') ?? '');
  readonly group = computed(() => this.context.analysis()?.groups.find(group => group.idbGroupId === this.groupGuid()));
  readonly meterGroup = computed(() => this.context.meterGroups().find(group => group.guid === this.groupGuid()));
  readonly tabs = computed(() => tabsForAnalysisGroup(this.group()));
  readonly activeTab = this.activeTabState.asReadonly();
  private readonly canonicalRouteEffect = effect(() => {
    const facility = this.context.facility();
    const analysis = this.context.analysis();
    const group = this.group();
    if (!facility || !analysis || !group) return;
    const tab = this.activeTabState();
    if ((tab === 'regression' && group.analysisType !== 'regression')
      || ((tab === 'annual' || tab === 'monthly') && isSkippedAnalysisType(group.analysisType))) {
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

  openTab(tab: string): void {
    if (!isAnalysisWorkbenchTab(tab)) return;
    const facility = this.context.facility();
    const analysis = this.context.analysis();
    const group = this.group();
    if (facility && analysis && group && this.tabs().some(item => item.id === tab)) {
      void this.router.navigate([
        '/v1', 'workspace', 'facility', facility.guid, 'analysis', 'workbench', analysis.guid,
        'group', group.idbGroupId, tab
      ]);
    }
  }

  private syncActiveTab(): void {
    const tab = this.route.firstChild?.snapshot.data['analysisTab'];
    this.activeTabState.set(isAnalysisWorkbenchTab(tab) ? tab : 'setup');
  }
}

function isAnalysisWorkbenchTab(value: unknown): value is AnalysisWorkbenchTabId {
  return value === 'setup' || value === 'regression' || value === 'annual' || value === 'monthly';
}
