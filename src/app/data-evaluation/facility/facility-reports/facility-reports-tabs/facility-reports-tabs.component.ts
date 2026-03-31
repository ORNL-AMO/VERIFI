import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityReportsDbService } from 'src/app/indexedDB/facility-reports-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';

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
  selectedReportSub: Subscription;
  selectedReport: IdbFacilityReport;
  reportList: Array<IdbFacilityReport>;
  reportListSub: Subscription;
  facility: IdbFacility;
  facilitySub: Subscription;
  showDropdown: boolean = false;
  analysisVisited: boolean = false;
  constructor(private router: Router,
    private sharedDataService: SharedDataService,
    private facilityReportsDbService: FacilityReportsDbService,
    private facilityDbService: FacilitydbService,
    private analysisDbService: AnalysisDbService) { }
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

    this.selectedReportSub = this.facilityReportsDbService.selectedReport.subscribe(val => {
      this.selectedReport = val;
      if (this.selectedReport) {
        this.checkIfAnalysisVisited();
      }
    });

    this.reportListSub = this.facilityReportsDbService.facilityReports.subscribe(reports => {
      this.reportList = reports;
    });

    this.analysisDbService.selectedAnalysisItem.subscribe(analysisItem => {
      if (analysisItem) {
        this.checkIfAnalysisVisited();
      }
    });
  }

  ngOnDestroy() {
    this.modalOpenSub.unsubscribe();
    this.routerSub.unsubscribe();
    this.selectedReportSub.unsubscribe();
    this.facilitySub.unsubscribe();
    this.reportListSub.unsubscribe();
  }


  setInDashboard() {
    this.inDashboard = this.router.url.includes('dashboard');
  }

  goToDashboard() {
    this.router.navigateByUrl('/data-evaluation/facility/' + this.facility.guid + '/reports/dashboard');
  }

  checkIfAnalysisVisited() {
    if (this.selectedReport) {
      let analysisItem: IdbAnalysisItem = this.analysisDbService.getByGuid(this.selectedReport.analysisItemId);
      if (analysisItem) {
        this.analysisVisited = analysisItem.isAnalysisVisited;
      }
      else {
        this.analysisVisited = false;
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
