import { TemplatePortal } from '@angular/cdk/portal';
import { Component, DestroyRef, OnDestroy, TemplateRef, ViewChild, ViewContainerRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { IdbPredictor } from '@data/models/idbModels/predictor';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { AccountPortfolioTab, WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { BrowseHeaderDirective } from '@app/v1/shared/navigation/browse-header/browse-header.directive';
import { IconName } from '@app/v1/shared/icons/icon-registry';

import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';

import { inventoryScopeBreadcrumbs } from '@app/v1/shared/page-identity/page-identity.component';
import { MetersInventoryComponent } from '@app/v1/data/meters/inventory/meters-inventory.component';
import { PredictorsInventoryComponent } from '@app/v1/data/predictors/inventory/predictors-inventory.component';

interface PortfolioTotals {
  readonly facilities: number;
}

@Component({
  selector: 'app-data-inventory',
  templateUrl: './data-inventory.component.html',
  styleUrls: ['./data-inventory.component.css'],
  standalone: false
})
export class DataInventoryComponent implements OnDestroy {
  private readonly router = inject(Router);
  readonly navigation = inject(WorkspaceNavigationService);
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
  private readonly selectionInventory = signal<MetersInventoryComponent | PredictorsInventoryComponent | undefined>(undefined);
  readonly selectionTools = computed(() => this.selectionInventory()?.tools());
  readonly canSelectItems = computed(() => {
    const inventory = this.selectionInventory(), tools = this.selectionTools();
    if (!inventory || !tools) return false;
    return tools.canAct() && (tools.selecting() || !!inventory.matchingGuids().length);
  });
  readonly dataValidationRoute = computed(() => {
    const facilityGuid = this.navigation.inventoryFacilityGuid();
    const account = this.account();
    return facilityGuid ? this.navigation.facilitySettingsRoute(facilityGuid, 'data-validation')
      : account ? this.navigation.accountSettingsRoute(account.guid, 'data-validation') : [];
  });
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
  readonly breadcrumbs = computed(() => inventoryScopeBreadcrumbs(this.account()?.name ?? 'Account',
    this.workspace.facilities().find(facility => facility.guid === this.navigation.inventoryFacilityGuid())?.name, this.navigation.isSingleSiteWorkspace()));
  readonly meterNavigationError = signal('');
  readonly isCreateFacilityDrawerOpen = signal(false);

  constructor() {
    const unregister = inject(UnsavedChangesService).register(() => false, () => {},
      () => this.isCreateFacilityDrawerOpen() || this.isCreateMeterDrawerOpen() || this.isCreatePredictorDrawerOpen());
    inject(DestroyRef).onDestroy(unregister);
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

  inventoryActivated(component: unknown): void {
    this.selectionInventory.set(component instanceof MetersInventoryComponent || component instanceof PredictorsInventoryComponent ? component : undefined);
  }

  inventoryDeactivated(component: unknown): void {
    if (this.selectionInventory() === component) this.selectionInventory.set(undefined);
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
