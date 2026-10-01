import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { DataWorkbenchFactsToggleComponent } from '@app/v1/shared/data-workbench/data-workbench-facts-toggle.component';
import { DataWorkbenchResourceSwitcherComponent } from '@app/v1/shared/data-workbench/data-workbench-resource-switcher.component';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { activeAnalysisWorkbenchStageId, stageHasBlockingErrors } from './facility-analysis-workbench.models';
import { FacilityAnalysisWorkbenchContext } from './facility-analysis-workbench-context.service';
import { AnalysisAutosaveState, FacilityAnalysisAutosaveService } from './facility-analysis-autosave.service';
import { FacilityAnalysisResultsService } from './facility-analysis-results.service';
import { FacilityAnalysisResultsDisplayService } from './facility-analysis-results-display.service';

@Component({
  selector: 'app-facility-analysis-workbench',
  standalone: true,
  providers: [
    FacilityAnalysisWorkbenchContext,
    FacilityAnalysisAutosaveService,
    FacilityAnalysisResultsService,
    FacilityAnalysisResultsDisplayService
  ],
  imports: [RouterOutlet, RouterLink, IconComponent, DataWorkbenchFactsToggleComponent, DataWorkbenchResourceSwitcherComponent],
  templateUrl: './facility-analysis-workbench.component.html',
  styleUrls: ['./facility-analysis-workbench.component.css']
})
export class FacilityAnalysisWorkbenchComponent {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly activeStageState = signal(activeAnalysisWorkbenchStageId(this.router.url));
  readonly context = inject(FacilityAnalysisWorkbenchContext);
  readonly navigation = inject(WorkspaceNavigationService);
  readonly autosave = inject(FacilityAnalysisAutosaveService);
  readonly results = inject(FacilityAnalysisResultsService);
  readonly activeStageId = this.activeStageState.asReadonly();
  readonly analysisResources = computed(() => this.context.analyses().map(analysis => ({
    id: analysis.guid,
    label: analysis.name || 'Untitled analysis',
    icon: 'analysis' as const
  })));
  readonly stageIndex = computed(() => this.context.stages().findIndex(stage => stage.id === this.activeStageId()));
  readonly currentStage = computed(() => this.context.stages()[this.stageIndex()]);
  readonly previousStage = computed(() => this.context.stages()[this.stageIndex() - 1]);
  readonly nextStage = computed(() => this.context.stages()[this.stageIndex() + 1]);
  readonly currentStageHasBlockingErrors = computed(() => stageHasBlockingErrors(
    this.currentStage(), this.context.analysisGuid(), this.context.findings()
  ));
  readonly navigationRequirement = computed(() => analysisNavigationRequirement(
    this.autosave.state(), this.currentStageHasBlockingErrors(), !!this.nextStage()
  ));
  readonly navigationDisabled = computed(() => !!this.navigationRequirement());

  constructor() {
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(event => this.activeStageState.set(activeAnalysisWorkbenchStageId(event.urlAfterRedirects)));
  }

  switchAnalysis(analysisGuid: string): void {
    const facility = this.context.facility();
    if (facility) void this.router.navigate(this.navigation.facilityAnalysisWorkbenchRoute(facility.guid, analysisGuid));
  }

  back(): void {
    const previous = this.previousStage();
    if (previous) {
      void this.router.navigate(previous.route);
      return;
    }
    const facility = this.context.facility();
    if (facility) void this.router.navigate(this.navigation.facilityAnalysisRoute(facility.guid));
  }

  continue(): void {
    const next = this.nextStage();
    if (next) void this.router.navigate(next.route);
  }

  finish(): void {
    const facility = this.context.facility();
    if (facility) void this.router.navigate(this.navigation.facilityAnalysisRoute(facility.guid));
  }

  hasUnsavedChanges(): boolean { return this.autosave.isDirty(); }
  isNavigationBlocked(): boolean { return this.autosave.isBlocked(); }
}

export function analysisNavigationRequirement(
  autosaveState: AnalysisAutosaveState,
  currentStageHasBlockingErrors: boolean,
  hasNextStage: boolean
): string | undefined {
  if (autosaveState === 'saving') return 'Saving changes before navigation is available.';
  if (autosaveState === 'invalid') return 'Fix the validation errors before continuing.';
  if (autosaveState === 'error') return 'Retry or discard the unsaved changes before continuing.';
  if (hasNextStage && currentStageHasBlockingErrors) return 'Resolve the errors in this stage before continuing.';
  return undefined;
}
