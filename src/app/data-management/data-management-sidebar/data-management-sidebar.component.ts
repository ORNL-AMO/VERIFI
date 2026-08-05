import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, EventEmitter, Output, inject, computed } from '@angular/core';
import { firstValueFrom, Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FileReference } from 'src/app/data-management/data-management-import/import-services/upload-data-models';
import { DataManagementService } from '../data-management.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { PredictorDbService } from 'src/app/indexedDB/predictor-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { NavigationEnd, Router } from '@angular/router';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';
import { IdbFacilityEnergyUseGroup } from 'src/app/models/idbModels/facilityEnergyUseGroups';
import { FacilityEnergyUseGroupsDbService } from 'src/app/indexedDB/facility-energy-use-groups-db.service';
import { IdbFacilityEnergyUseEquipment } from 'src/app/models/idbModels/facilityEnergyUseEquipment';
import { FacilityEnergyUseEquipmentDbService } from 'src/app/indexedDB/facility-energy-use-equipment-db.service';

@Component({
  selector: 'app-data-management-sidebar',
  templateUrl: './data-management-sidebar.component.html',
  styleUrl: './data-management-sidebar.component.css',
  standalone: false
})
export class DataManagementSidebarComponent {
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

  constructor(private accountDbService: AccountdbService, private facilityDbService: FacilitydbService,
    private dataManagementService: DataManagementService,
    private utilityMeterDbService: UtilityMeterdbService,
    private predictorDbService: PredictorDbService,
    private dbChangesService: DbChangesService,
    private router: Router,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private predictorDataDbService: PredictorDataDbService,
    private facilityEnergyUseGroupsDbService: FacilityEnergyUseGroupsDbService,
    private facilityEnergyUseEquipmentDbService: FacilityEnergyUseEquipmentDbService
  ) {
  }

  ngOnInit() {
    this.accountSub = toObservable(this.accountWorkspaceStore.account).subscribe(account => {
      this.account = account;
    });
    this.facilitiesSub = toObservable(this.accountWorkspaceStore.facilities).subscribe(facilities => {
      this.facilities = facilities.map(facility => ({ ...facility }));
    });
    this.fileReferencesSub = this.dataManagementService.fileReferences.subscribe(fileReferences => {
      this.fileReferences = fileReferences;
    });
    this.accountMetersSub = toObservable(computed(() => [...this.accountWorkspaceStore.meters()])).subscribe(accountMeters => {
      this.accountMeters = accountMeters.map(meter => { return { ...meter, open: false } });
    });
    this.accountPredictorsSub = toObservable(computed(() => [...this.accountWorkspaceStore.predictors()])).subscribe(accountPredictors => {
      this.accountPredictors = accountPredictors;
    });
    this.selectedFacilitySub = toObservable(this.accountWorkspaceStore.selectedFacility).subscribe(facility => {
      this.selectedFacility = facility;
    });
    this.selectedMeterSub = toObservable(this.accountWorkspaceStore.selectedMeter).subscribe(meter => {
      this.selectedMeter = meter;
    });

    this.accountMeterDataSub = toObservable(computed(() => [...this.accountWorkspaceStore.meterData()])).subscribe(accountMeterData => {
      this.accountMeterData = accountMeterData;
    });

    this.accountPredictorDataSub = toObservable(computed(() => [...this.accountWorkspaceStore.predictorData()])).subscribe(accountPredictorData => {
      this.accountPredictorData = accountPredictorData;
    });

    this.accountEnergyUseGroupsSub = this.facilityEnergyUseGroupsDbService.accountEnergyUseGroups.subscribe(groups => {
      this.accountEnergyUseGroups = groups;
    });

    this.accountEnergyUseEquipmentSub = this.facilityEnergyUseEquipmentDbService.accountEnergyUseEquipment.subscribe(equipment => {
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
    await this.dbChangesService.updateAccount({
      ...this.account,
      sidebarFacilitiesOpen: !this.account.sidebarFacilitiesOpen
    });
  }

  async toggleFacilityOpen(facility: IdbFacility) {
    facility.sidebarOpen = !facility.sidebarOpen;
    this.saveFacility(facility);
  }

  async toggleMeterOpen(meter: IdbUtilityMeter) {
    meter.sidebarOpen = !meter.sidebarOpen;
    await firstValueFrom(this.utilityMeterDbService.updateWithObservable(meter));
    let selectedAccount: IdbAccount = this.accountWorkspaceStore.account();
    let selectedFacility: IdbFacility = this.accountWorkspaceStore.selectedFacility();
    await this.dbChangesService.setMeters(selectedAccount, selectedFacility);
  }

  async toggleFacilityMetersOpen(facility: IdbFacility) {
    facility.sidebarMetersOpen = !facility.sidebarMetersOpen;
    await this.saveFacility(facility);
  }

  async saveFacility(facility: IdbFacility) {
    await this.dbChangesService.updateFacility({ ...facility });
  }

  async toggleFacilityPredictorsOpen(facility: IdbFacility) {
    facility.sidebarPredictorsOpen = !facility.sidebarPredictorsOpen;
    await this.saveFacility(facility);
  }

  async togglePredictorOpen(predictor: IdbPredictor) {
    predictor.sidebarOpen = !predictor.sidebarOpen;
    await firstValueFrom(this.predictorDbService.updateWithObservable(predictor));
    let selectedAccount: IdbAccount = this.accountWorkspaceStore.account();
    let selectedFacility: IdbFacility = this.accountWorkspaceStore.selectedFacility();
    await this.dbChangesService.setPredictorsV2(selectedAccount, selectedFacility);
  }

  async toggleCustomDataOpen() {
    await this.dbChangesService.updateAccount({
      ...this.account,
      sidebarCustomDataOpen: !this.account.sidebarCustomDataOpen
    });
  }

  async toggleFacilityEnergyUsesOpen(facility: IdbFacility) {
    facility.sidebarEnergyUsesOpen = !facility.sidebarEnergyUsesOpen;
    await this.saveFacility(facility);
  }

  async toggleEnergyUseGroupOpen(energyUseGroup: IdbFacilityEnergyUseGroup) {
    energyUseGroup.sidebarOpen = !energyUseGroup.sidebarOpen;
    await firstValueFrom(this.facilityEnergyUseGroupsDbService.updateWithObservable(energyUseGroup));
    let selectedAccount: IdbAccount = this.accountWorkspaceStore.account();
    let selectedFacility: IdbFacility = this.accountWorkspaceStore.selectedFacility();
    await this.dbChangesService.setAccountFacilityEnergyUseGroups(selectedAccount, selectedFacility);
  }

  toggleSidebar() {
    this.emitToggleCollapse.emit(!this.sidebarOpen);
  }
}
