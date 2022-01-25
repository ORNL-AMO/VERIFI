import { Component, Input, OnInit } from '@angular/core';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility } from 'src/app/models/idb';
import { ReportOptions } from 'src/app/models/overview-report';

@Component({
  selector: 'app-facility-report',
  templateUrl: './facility-report.component.html',
  styleUrls: ['./facility-report.component.css']
})
export class FacilityReportComponent implements OnInit {
  @Input()
  facility: {
    facilityId: number,
    selected: boolean
  };
  @Input()
  reportOptions: ReportOptions;

  selectedFacility: IdbFacility;
  constructor(private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    let accountFacilites: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    this.selectedFacility = accountFacilites.find(facility => {return facility.id == this.facility.facilityId});
  }
}
