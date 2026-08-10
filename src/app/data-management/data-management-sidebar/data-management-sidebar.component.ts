import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, EventEmitter, Output, inject, computed, Injector } from '@angular/core';
import { Subscription } from 'rxjs';
import { FileReference } from 'src/app/data-management/data-management-import/import-services/upload-data-models';
import { DataManagementService } from '../data-management.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { WorkspaceCommandBoundary } from 'src/app/account-workspace/workspace-command-boundary.service';
import { AccountCommandHandler } from 'src/app/account-workspace/handlers/account-command-handler.service';
import { FacilityCommandHandler } from 'src/app/account-workspace/handlers/facility-command-handler.service';
import { MeterCommandHandler } from 'src/app/account-workspace/handlers/meter-command-handler.service';
import { PredictorCommandHandler } from 'src/app/account-workspace/handlers/predictor-command-handler.service';
import { EnergyUseCommandHandler } from 'src/app/account-workspace/handlers/energy-use-command-handler.service';
import { NavigationEnd, Router } from '@angular/router';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { IdbFacilityEnergyUseGroup } from 'src/app/models/idbModels/facilityEnergyUseGroups';
import { IdbFacilityEnergyUseEquipment } from 'src/app/models/idbModels/facilityEnergyUseEquipment';

@Component({
  selector: 'app-data-management-sidebar',
  templateUrl: './data-management-sidebar.component.html',
  styleUrl: './data-management-sidebar.component.css',
  standalone: false
})
export class DataManagementSidebarComponent {
  private readonly accountWorkspaceService = inject(AccountWorkspaceService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  @Output('emitToggleCollapse')
  emitToggleCollapse: EventEmitter<boolean> = new EventEmitter<boolean>(false);


  account: IdbAccount;
  accountSub: Subscription;

  facilities: Array<IdbFacility>;
  facilitiesSub: Subscription;

  selectedFacility: IdbFacility;
  selectedFacilitySub: Subscription;

  accountMeters: Array<IdbUtilityMeter>;
  accountMetersSub: Subscription;

  selectedMeter: IdbUtilityMeter;
  selectedMeterSub: Subscription;

  fileReferencesSub: Subscription;
  fileReferences: Array<FileReference>;

  accountPredictors: Array<IdbPredictor>;
  accountPredictorsSub: Subscription;

  accountMeterData: Array<IdbUtilityMeterData>;
  accountMeterDataSub: Subscription;

  accountPredictorData: Array<IdbPredictorData>;
  accountPredictorDataSub: Subscription;

  sidebarOpen: boolean;
  sidebarOpenSub: Subscription;

  url: string;
  routerSub: Subscription;

  accountEnergyUseGroups: Array<IdbFacilityEnergyUseGroup>;
  accountEnergyUseGroupsSub: Subscription;

  accountEnergyUseEquipmentSub: Subscription;
  accountEnergyUseEquipment: Array<IdbFacilityEnergyUseEquipment>;

  constructor(
    private dataManagementService: DataManagementService,
    private commandBoundary: WorkspaceCommandBoundary,
    private accountHandler: AccountCommandHandler,
    private facilityHandler: FacilityCommandHandler,
    private meterHandler: MeterCommandHandler,
    private predictorHandler: PredictorCommandHandler,
    private energyUseHandler: EnergyUseCommandHandler,
    private router: Router,
    private injector: Injector

  ) {
  }

  ngOnInit() {
    this.accountSub = toObservable(this.accountWorkspaceStore.account, { injector: this.injector }).subscribe(account => {
      this.account = account;
    });
    this.facilitiesSub = toObservable(this.accountWorkspaceStore.facilities, { injector: this.injector }).subscribe(facilities => {
      this.facilities = facilities.map(facility => ({ ...facility }));
    });
    this.fileReferencesSub = this.dataManagementService.fileReferences.subscribe(fileReferences => {
      this.fileReferences = fileReferences;
    });
    this.accountMetersSub = toObservable(computed(() => [...this.accountWorkspaceStore.meters()]), { injector: this.injector }).subscribe(accountMeters => {
      this.accountMeters = accountMeters.map(meter => { return { ...meter, open: false } });
    });
    this.accountPredictorsSub = toObservable(computed(() => [...this.accountWorkspaceStore.predictors()]), { injector: this.injector }).subscribe(accountPredictors => {
      this.accountPredictors = accountPredictors;
    });
    this.selectedFacilitySub = toObservable(this.accountWorkspaceStore.selectedFacility, { injector: this.injector }).subscribe(facility => {
      this.selectedFacility = facility;
    });
    this.selectedMeterSub = toObservable(this.accountWorkspaceStore.selectedMeter, { injector: this.injector }).subscribe(meter => {
      this.selectedMeter = meter;
    });

    this.accountMeterDataSub = toObservable(computed(() => [...this.accountWorkspaceStore.meterData()]), { injector: this.injector }).subscribe(accountMeterData => {
      this.accountMeterData = accountMeterData;
    });

    this.accountPredictorDataSub = toObservable(computed(() => [...this.accountWorkspaceStore.predictorData()]), { injector: this.injector }).subscribe(accountPredictorData => {
      this.accountPredictorData = accountPredictorData;
    });

    this.accountEnergyUseGroupsSub = toObservable(computed(() => [...this.accountWorkspaceStore.energyUseGroups()]), { injector: this.injector }).subscribe(groups => {
      this.accountEnergyUseGroups = groups;
    });

    this.accountEnergyUseEquipmentSub = toObservable(computed(() => [...this.accountWorkspaceStore.energyUseEquipment()]), { injector: this.injector }).subscribe(equipment => {
      this.accountEnergyUseEquipment = equipment;
    });

    this.sidebarOpenSub = this.dataManagementService.sidebarOpen.subscribe(val => {
      this.sidebarOpen = val;
      setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
      }, 100)
    })
    this.routerSub = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.url = this.router.url;
      }
    });
    this.url = this.router.url;
  }

  ngOnDestroy() {
    this.accountSub.unsubscribe();
    this.facilitiesSub.unsubscribe();
    this.fileReferencesSub.unsubscribe();
    this.accountPredictorsSub.unsubscribe();
    this.accountMetersSub.unsubscribe();
    this.selectedFacilitySub.unsubscribe();
    this.selectedMeterSub.unsubscribe();
    this.sidebarOpenSub.unsubscribe();
    this.routerSub.unsubscribe();
    this.accountMeterDataSub.unsubscribe();
    this.accountPredictorDataSub.unsubscribe();
    this.accountEnergyUseGroupsSub.unsubscribe();
    this.accountEnergyUseEquipmentSub.unsubscribe();
  }

  async toggleFacilitiesOpen() {
    const account = { ...this.account, sidebarFacilitiesOpen: !this.account.sidebarFacilitiesOpen };
    await this.commandBoundary.execute(
      { entityKind: 'account', changeKind: 'update', entityGuid: account.guid, label: 'Toggling sidebar' ,
        publication: { mode: 'patch', buildPatch: value => ({ account: value }) }},
      () => this.accountHandler.update(account, account.guid)
    );
  }

  async toggleFacilityOpen(facility: IdbFacility) {
    facility.sidebarOpen = !facility.sidebarOpen;
    this.saveFacility(facility);
  }

  async toggleMeterOpen(meter: IdbUtilityMeter) {
    const updated = { ...meter, sidebarOpen: !meter.sidebarOpen };
    await this.commandBoundary.execute(
      { entityKind: 'meter', changeKind: 'update', entityGuid: meter.guid, label: 'Toggling sidebar' ,
        publication: { mode: 'patch', buildPatch: value => ({ collections: [{ collection: 'meters', upsert: [value] }] }) }},
      () => this.meterHandler.updateMeter(updated, this.account?.guid)
    );
  }

  async toggleFacilityMetersOpen(facility: IdbFacility) {
    facility.sidebarMetersOpen = !facility.sidebarMetersOpen;
    await this.saveFacility(facility);
  }

  async saveFacility(facility: IdbFacility) {
    await this.commandBoundary.execute(
      { entityKind: 'facility', changeKind: 'update', entityGuid: facility.guid, label: 'Updating facility' ,
        publication: { mode: 'patch', buildPatch: value => ({ collections: [{ collection: 'facilities', upsert: [value] }] }) }},
      () => this.facilityHandler.update({ ...facility }, this.account?.guid)
    );
  }

  async toggleFacilityPredictorsOpen(facility: IdbFacility) {
    facility.sidebarPredictorsOpen = !facility.sidebarPredictorsOpen;
    await this.saveFacility(facility);
  }

  async togglePredictorOpen(predictor: IdbPredictor) {
    const updated = { ...predictor, sidebarOpen: !predictor.sidebarOpen };
    await this.commandBoundary.execute(
      { entityKind: 'predictor', changeKind: 'update', entityGuid: predictor.guid, label: 'Toggling sidebar' ,
        publication: { mode: 'patch', buildPatch: value => ({ collections: [{ collection: 'predictors', upsert: [value] }] }) }},
      () => this.predictorHandler.updatePredictor(updated, this.account?.guid)
    );
  }

  async toggleCustomDataOpen() {
    const account = { ...this.account, sidebarCustomDataOpen: !this.account.sidebarCustomDataOpen };
    await this.commandBoundary.execute(
      { entityKind: 'account', changeKind: 'update', entityGuid: account.guid, label: 'Toggling sidebar' ,
        publication: { mode: 'patch', buildPatch: value => ({ account: value }) }},
      () => this.accountHandler.update(account, account.guid)
    );
  }

  async toggleFacilityEnergyUsesOpen(facility: IdbFacility) {
    facility.sidebarEnergyUsesOpen = !facility.sidebarEnergyUsesOpen;
    await this.saveFacility(facility);
  }

  async toggleEnergyUseGroupOpen(energyUseGroup: IdbFacilityEnergyUseGroup) {
    const updated = { ...energyUseGroup, sidebarOpen: !energyUseGroup.sidebarOpen };
    await this.commandBoundary.execute(
      { entityKind: 'energyUseGroup', changeKind: 'update', entityGuid: energyUseGroup.guid, label: 'Toggling sidebar' ,
        publication: { mode: 'patch', buildPatch: value => ({ collections: [{ collection: 'energyUseGroups', upsert: [value] }] }) }},
      () => this.energyUseHandler.updateGroup(updated, this.account?.guid)
    );
  }

  toggleSidebar() {
    this.emitToggleCollapse.emit(!this.sidebarOpen);
  }
}
