import { Component, Input, OnInit } from '@angular/core';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { IdbFacility, IdbUtilityMeter, MeterSource } from 'src/app/models/idb';
import { ReportOptions } from 'src/app/models/overview-report';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { OverviewReportService } from '../../overview-report.service';

@Component({
  selector: 'app-facility-report',
  templateUrl: './facility-report.component.html',
  styleUrls: ['./facility-report.component.css']
})
export class FacilityReportComponent implements OnInit {
  @Input()
  facility: {
    facilityId: string,
    selected: boolean
  };
  @Input()
  reportOptions: ReportOptions;

  selectedFacility: IdbFacility;
  calanderizedMeters: Array<CalanderizedMeter>;
  constructor(private facilityDbService: FacilitydbService, private utilityMeterDbService: UtilityMeterdbService,
    private calanderizationService: CalanderizationService, private overviewReportService: OverviewReportService) { }

  ngOnInit(): void {
    let accountFacilites: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    this.selectedFacility = accountFacilites.find(facility => { return facility.guid == this.facility.facilityId });
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let sources: Array<MeterSource> = this.overviewReportService.getSelectedSources(this.reportOptions);
    let facilityMeters: Array<IdbUtilityMeter> = accountMeters.filter(meter => { return meter.facilityId == this.facility.facilityId && sources.includes(meter.source) });
    this.calanderizedMeters = this.calanderizationService.getCalanderizedMeterData(facilityMeters, false, true, this.reportOptions);
  }
}
