import { Component, Input } from '@angular/core';
import { OverviewReportService } from 'src/app/account/overview-report/overview-report.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility } from 'src/app/models/idb';

@Component({
  selector: 'app-facility-title-page',
  templateUrl: './facility-title-page.component.html',
  styleUrls: ['./facility-title-page.component.css']
})
export class FacilityTitlePageComponent {
  @Input()
  facility: IdbFacility;

  naics: string;
  constructor(private facilityDbService: FacilitydbService,
    private overviewReportService: OverviewReportService) {

  }

  ngOnInit() {
    this.naics = this.overviewReportService.getNAICS(this.facility);
  }

}
