import { TemplatePortal } from '@angular/cdk/portal';
import { Component, OnDestroy, TemplateRef, ViewChild, ViewContainerRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { IdbPredictor } from '@data/models/idbModels/predictor';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { AccountPortfolioTab, WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { BrowseHeaderDirective } from '@app/v1/shared/navigation/browse-header/browse-header.directive';
import { IconName } from '@app/v1/shared/icons/icon-registry';

interface PortfolioTotals {
  readonly facilities: number;
}

@Component({
  selector: 'app-account-portfolio',
  templateUrl: './account-portfolio.component.html',
  styleUrls: ['./account-portfolio.component.css'],
  standalone: false
})
export class AccountPortfolioComponent implements OnDestroy {
  private readonly router = inject(Router);
  private readonly navigation = inject(WorkspaceNavigationService);
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly modalPortal = inject(ModalPortalService);
  private readonly viewContainerRef = inject(ViewContainerRef);

  private readonly sticky = viewChild(BrowseHeaderDirective);

  @ViewChild('createFacilityDrawer') private readonly createFacilityDrawer!: TemplateRef<unknown>;

  @ViewChild('createMeterDrawer') private readonly createMeterDrawer!: TemplateRef<unknown>;
  private readonly meterDrawerAccountGuid = signal<string | undefined>(undefined);

  @ViewChild('createPredictorDrawer') private readonly createPredictorDrawer!: TemplateRef<unknown>;
  private readonly predictorDrawerAccountGuid = signal<string | undefined>(undefined);
  readonly isCreatePredictorDrawerOpen = signal(false);
  readonly isPredictors = computed(() => this.activeContent() === 'predictors');

  readonly account = this.workspace.account;
  readonly canWrite = this.workspace.canWrite;
  readonly hasPending = this.workspace.hasPending;
  readonly activeContent = computed(() => this.navigation.activePortfolioTab() || 'facilities');
  readonly isFacilities = computed(() => this.activeContent() === 'facilities');
  readonly isMeters = computed(() => this.activeContent() === 'meters');
  readonly title = computed(() => ({
    facilities: 'Facilities', meters: 'Meters', predictors: 'Predictors',
    'energy-uses': 'Energy Uses'
  })[this.activeContent()]);
  readonly headerIcon = computed(() => ({
    facilities: 'facility', meters: 'meter', predictors: 'predictor',
    'energy-uses': 'tools'
  } satisfies Record<AccountPortfolioTab, IconName>)[this.activeContent()]);
  readonly isCreateMeterDrawerOpen = signal(false);
  readonly headerGapCollapsed = computed(() => this.sticky()?.collapsed() ?? false);
  readonly breadcrumbs = computed(() => [{ label: this.account()?.name ?? 'Account' }]);
  readonly meterNavigationError = signal('');
  readonly isCreateFacilityDrawerOpen = signal(false);

  constructor() {
    effect(() => {
      if (this.isCreatePredictorDrawerOpen() && (!this.isPredictors() || this.account()?.guid !== this.predictorDrawerAccountGuid())) this.closeCreatePredictorDrawer();
    });
    effect(() => {
      if (this.isCreateMeterDrawerOpen()
        && (!this.isMeters() || this.account()?.guid !== this.meterDrawerAccountGuid())) {
        this.closeCreateMeterDrawer();
      }
    });
  }

  openCreateMeterDrawer(): void {
    if (!this.isMeters() || !this.canWrite() || this.hasPending() || !this.totals().facilities) { return; }
    this.meterNavigationError.set('');
    this.meterDrawerAccountGuid.set(this.account()?.guid);
    this.isCreateMeterDrawerOpen.set(true);
    this.modalPortal.show(new TemplatePortal(this.createMeterDrawer, this.viewContainerRef));
  }

  closeCreateMeterDrawer(): void {
    this.isCreateMeterDrawerOpen.set(false);
    this.modalPortal.hide();
  }

  async openCreatedMeter(meter: IdbUtilityMeter): Promise<void> {
    this.closeCreateMeterDrawer();
    if (meter.accountId !== this.account()?.guid) { return; }
    try {
      const opened = await this.router.navigate(this.navigation.facilityMeterRoute(meter.facilityId, meter.guid, 'settings'));
      if (!opened) { throw new Error('Navigation cancelled'); }
    } catch {
      this.meterNavigationError.set('Meter added. Its settings could not be opened; select the meter from the list to continue.');
    }
  }

  openCreatePredictorDrawer(): void {
    if (!this.isPredictors() || !this.canWrite() || this.hasPending() || !this.totals().facilities) return;
    this.meterNavigationError.set(''); this.predictorDrawerAccountGuid.set(this.account()?.guid);
    this.isCreatePredictorDrawerOpen.set(true); this.modalPortal.show(new TemplatePortal(this.createPredictorDrawer, this.viewContainerRef));
  }
  closeCreatePredictorDrawer(): void { this.isCreatePredictorDrawerOpen.set(false); this.modalPortal.hide(); }
  async openCreatedPredictor(predictor: IdbPredictor): Promise<void> {
    this.closeCreatePredictorDrawer(); if (predictor.accountId !== this.account()?.guid) return;
    try { const opened = await this.router.navigate(this.navigation.facilityPredictorRoute(predictor.facilityId, predictor.guid, 'settings')); if (!opened) throw new Error('Navigation cancelled'); }
    catch { this.meterNavigationError.set('Predictor added. Select it from the list to open its settings.'); }
  }
  async openNewWeatherPredictors(facilityGuid: string): Promise<void> {
    this.closeCreatePredictorDrawer();
    if (!this.workspace.facilities().some(item => item.guid === facilityGuid)) return;
    try { await this.router.navigate(this.navigation.facilityWeatherPredictorCreateRoute(facilityGuid)); }
    catch { this.meterNavigationError.set('Weather setup could not be opened. Please try again.'); }
  }

  ngOnDestroy(): void {
    this.modalPortal.hide();
  }

  readonly totals = computed<PortfolioTotals>(() => {
    return {
      facilities: this.workspace.facilities().length,
    };
  });

  openCreateFacilityDrawer(): void {
    if (!this.canWrite() || this.hasPending()) {
      return;
    }
    this.isCreateFacilityDrawerOpen.set(true);
    this.modalPortal.show(new TemplatePortal(this.createFacilityDrawer, this.viewContainerRef));
  }

  closeCreateFacilityDrawer(): void {
    this.isCreateFacilityDrawerOpen.set(false);
    this.modalPortal.hide();
  }

}
