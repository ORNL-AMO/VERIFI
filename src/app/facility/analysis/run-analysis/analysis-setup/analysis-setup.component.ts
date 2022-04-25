import { Component, OnInit } from '@angular/core';
import { Month, Months } from 'src/app/shared/form-data/months';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbAnalysisItem, IdbFacility } from 'src/app/models/idb';
import { EnergyUnitOptions, UnitOption } from 'src/app/shared/unitOptions';
import * as _ from 'lodash';
import { AnalysisCalculationsHelperService } from 'src/app/shared/shared-analysis/calculations/analysis-calculations-helper.service';
@Component({
  selector: 'app-analysis-setup',
  templateUrl: './analysis-setup.component.html',
  styleUrls: ['./analysis-setup.component.css']
})
export class AnalysisSetupComponent implements OnInit {

  energyUnitOptions: Array<UnitOption> = EnergyUnitOptions;
  months: Array<Month> = Months;

  facility: IdbFacility;
  energyUnit: string;
  analysisItem: IdbAnalysisItem;
  yearOptions: Array<number>;
  constructor(private facilityDbService: FacilitydbService, private analysisDbService: AnalysisDbService,
    private analysisCalculationsHelperService: AnalysisCalculationsHelperService) { }

  ngOnInit(): void {
    this.analysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    this.facility = this.facilityDbService.selectedFacility.getValue();
    this.energyUnit = this.facility.energyUnit;
    this.yearOptions = this.analysisCalculationsHelperService.getYearOptions();
  }

  saveItem() {
    this.analysisDbService.update(this.analysisItem);
    this.analysisDbService.selectedAnalysisItem.next(this.analysisItem);
  }

  changeReportYear() {
    if (this.facility.sustainabilityQuestions.energyReductionBaselineYear < this.analysisItem.reportYear) {
      let yearAdjustments: Array<{ year: number, amount: number }> = new Array();
      for (let year: number = this.facility.sustainabilityQuestions.energyReductionBaselineYear + 1; year <= this.analysisItem.reportYear; year++) {
        yearAdjustments.push({
          year: year,
          amount: 0
        })
      }
      this.analysisItem.groups.forEach(group => {
        group.baselineAdjustments = yearAdjustments;
      });
    }
    this.saveItem();
  }
}
