import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityReportsDbService } from 'src/app/indexedDB/facility-reports-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { FacilityReportsService } from '../facility-reports.service';

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
  reportList: Array<IdbFacilityReport>;
  reportListSub: Subscription;
  errorSub: Subscription;
  errorMessage: string;
  facility: IdbFacility;
  facilitySub: Subscription;
  showDropdown: boolean = false;
  constructor(private router: Router,
    private sharedDataService: SharedDataService,
    private facilityReportsDbService: FacilityReportsDbService,
    private facilityDbService: FacilitydbService,
    private facilityReportsService: FacilityReportsService) { }
  ngOnInit() {
    this.routerSub = this.router.events.subscribe(event => {
      this.setInDashboard();
      this.showDropdown = false;
    });
    this.setInDashboard();

    this.facilitySub = this.facilityDbService.selectedFacility.subscribe(facility => {
      this.facility = facility;
    })

    this.modalOpenSub = this.sharedDataService.modalOpen.subscribe(val => {
      this.modalOpen = val;
    });

    this.errorSub = this.facilityReportsService.errorMessage.subscribe(errorMessage => {
      this.errorMessage = errorMessage;
      this.setSetupValid();
    });

    this.selectedReportSub = this.facilityReportsDbService.selectedReport.subscribe(val => {
      this.selectedReport = val;
      if (this.selectedReport) {
        this.setSetupValid();
      }
    });

    this.reportListSub = this.facilityReportsDbService.facilityReports.subscribe(reports => {
      this.reportList = reports;
    });
  }

  ngOnDestroy() {
    this.modalOpenSub.unsubscribe();
    this.routerSub.unsubscribe();
    this.selectedReportSub.unsubscribe();
    this.facilitySub.unsubscribe();
    this.errorSub.unsubscribe();
    this.reportListSub.unsubscribe();
  }


  setInDashboard() {
    this.inDashboard = this.router.url.includes('dashboard');
  }

  goToDashboard() {
    if (this.selectedReport.facilityReportType == 'analysis') {
      this.router.navigateByUrl('/data-evaluation/facility/' + this.facility.guid + '/reports/dashboard/analysis');
    }
    else if (this.selectedReport.facilityReportType == 'overview') {
      this.router.navigateByUrl('/data-evaluation/facility/' + this.facility.guid + '/reports/dashboard/overview');
    }
    else if (this.selectedReport.facilityReportType == 'emissionFactors') {
      this.router.navigateByUrl('/data-evaluation/facility/' + this.facility.guid + '/reports/dashboard/emission-factors');
    }
  }

  setSetupValid() {
    if (this.selectedReport != undefined) {
      if (this.selectedReport.facilityReportType == 'analysis') {
        this.setupValid = (this.selectedReport.analysisItemId != undefined && this.selectedReport.name != '');
      } else if (this.selectedReport.facilityReportType == 'overview') {
        this.setupValid = (this.selectedReport.name != '' &&
          this.selectedReport.dataOverviewReportSettings.endMonth != undefined &&
          this.selectedReport.dataOverviewReportSettings.endYear != undefined &&
          this.selectedReport.dataOverviewReportSettings.startMonth != undefined &&
          this.selectedReport.dataOverviewReportSettings.startYear != undefined &&
          this.errorMessage == undefined)
      } else if (this.selectedReport.facilityReportType == 'emissionFactors') {
        this.setupValid = (this.selectedReport.name != '' &&
          this.selectedReport.emissionFactorsReportSettings.endYear != undefined &&
          this.selectedReport.emissionFactorsReportSettings.startYear != undefined &&
          this.errorMessage == undefined)
      } else {
        this.setupValid = false;
      }
    }
  }

  toggleShow() {
    this.showDropdown = !this.showDropdown;
  }

  selectItem(item: IdbFacilityReport) {
    this.facilityReportsDbService.selectedReport.next(item);
    let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.router.navigateByUrl('/data-evaluation/facility/' + facility.guid + '/reports/setup');
    this.showDropdown = false;
  }

}
