import { Component } from '@angular/core';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { ToastNotificationsService } from '../toast-notifications/toast-notifications.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { Subscription } from 'rxjs';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { ExportToEnergyTresureHuntFormService } from 'src/app/shared/helper-services/export-to-energy-tresure-hunt-form.service';

@Component({
  selector: 'app-export-energy-treasure-hunt-modal',
  standalone: false,
  templateUrl: './export-energy-treasure-hunt-modal.component.html',
  styleUrl: './export-energy-treasure-hunt-modal.component.css'
})
export class ExportEnergyTreasureHuntModalComponent {

  startYear: number;

  hostFacilityId: string;
  exchangeFacilityId: string;

  showModalSub: Subscription;
  showModal: boolean;
  facilityOptions: Array<IdbFacility>;
  yearOptions: Array<number>;


  constructor(private sharedDataService: SharedDataService,
    private accountDbService: AccountdbService,
    private toastNotificationService: ToastNotificationsService,
    private facilityDbService: FacilitydbService,
    private calanderizationService: CalanderizationService,
    private exportToEnergyTreasureHuntFormService: ExportToEnergyTresureHuntFormService) { }

  ngOnInit() {
    this.showModalSub = this.sharedDataService.exportEnergyTreasureHuntModalOpen.subscribe(val => {
      if (val == true) {
        this.initData();
      }
      this.showModal = val;
    });
  }

  ngOnDestroy() {
    this.showModalSub.unsubscribe();
  }

  cancelExport() {
    this.sharedDataService.exportEnergyTreasureHuntModalOpen.next(false);
  }

  exportData() {
    this.exportToEnergyTreasureHuntFormService.exportFacilityData(this.startYear, this.hostFacilityId, this.exchangeFacilityId);
    this.cancelExport();
  }

  initData() {
    this.yearOptions = this.calanderizationService.getYearOptionsAccount('all');
    this.yearOptions.pop();
    this.facilityOptions = this.facilityDbService.accountFacilities.getValue();
    this.hostFacilityId = undefined;
    this.exchangeFacilityId = undefined;
    this.startYear = undefined;

  }

}
