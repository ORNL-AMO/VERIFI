import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityReportsDbService } from 'src/app/indexedDB/facility-reports-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';

@Component({
  selector: 'app-facility-reports-tabs',
  templateUrl: './facility-reports-tabs.component.html',
  styleUrl: './facility-reports-tabs.component.css',
  standalone: false
})
export class FacilityReportsTabsComponent {

  routerSub: Subscription;
  inDashboard: boolean;
  modalOpenSub: Subscription;
  modalOpen: boolean;
  setupValid: boolean = true;
  selectedReportSub: Subscription;
  selectedReport: IdbFacilityReport;
  errorSub: Subscription;
  errorMessage: string = '';
  facility: IdbFacility;
  facilitySub: Subscription;
  constructor(private router: Router,
    private sharedDataService: SharedDataService,
    private facilityReportsDbService: FacilityReportsDbService,
    private facilityDbService: FacilitydbService) { }
  ngOnInit() {
    this.routerSub = this.router.events.subscribe(event => {
      this.setInDashboard();
    });
    this.setInDashboard();

    this.facilitySub = this.facilityDbService.selectedFacility.subscribe(facility => {
      this.facility = facility;
    })

    this.modalOpenSub = this.sharedDataService.modalOpen.subscribe(val => {
      this.modalOpen = val;
    });

    this.errorSub = this.facilityReportsDbService.errorMessage$.subscribe(errorMessage => {
      this.errorMessage = errorMessage;
      this.setSetupValid();  //setValidation() is called here to take care of the validation on browser reload.
    });

    this.selectedReportSub = this.facilityReportsDbService.selectedReport.subscribe(val => {
      this.selectedReport = val;
      if (this.selectedReport) {
        this.setSetupValid();
      }
    });
  }

  ngOnDestroy() {
    this.modalOpenSub.unsubscribe();
    this.routerSub.unsubscribe();
    this.selectedReportSub.unsubscribe();
    this.facilitySub.unsubscribe();
  }


  setInDashboard() {
    this.inDashboard = this.router.url.includes('dashboard');
  }

  goToDashboard() {
    this.router.navigateByUrl('/facility/' + this.facility.id + '/reports/dashboard')
  }

  setSetupValid() {
    if (this.selectedReport.facilityReportType == 'analysis') {
      this.setupValid = (this.selectedReport.analysisItemId != undefined && this.selectedReport.name != '');
    } else if (this.selectedReport.facilityReportType == 'overview') {
      this.setupValid = (this.selectedReport.name != '' &&
        this.selectedReport.dataOverviewReportSettings.endMonth != undefined &&
        this.selectedReport.dataOverviewReportSettings.endYear != undefined &&
        this.selectedReport.dataOverviewReportSettings.startMonth != undefined &&
        this.selectedReport.dataOverviewReportSettings.startYear != undefined &&
        this.errorMessage.length <= 0)
    } else {
      this.setupValid = false;
    }
  }
}
