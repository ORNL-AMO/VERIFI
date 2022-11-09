import { Component, OnInit } from '@angular/core';
import { Month, Months } from 'src/app/shared/form-data/months';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbAnalysisItem, IdbFacility } from 'src/app/models/idb';
import { EnergyUnitOptions, UnitOption } from 'src/app/shared/unitOptions';
import * as _ from 'lodash';
import { AnalysisCalculationsHelperService } from 'src/app/shared/shared-analysis/calculations/analysis-calculations-helper.service';
import { AnalysisService } from '../../analysis.service';
import { Router } from '@angular/router';
import { AnalysisValidationService } from '../../analysis-validation.service';
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
    private analysisCalculationsHelperService: AnalysisCalculationsHelperService,
    private analysisService: AnalysisService, private router: Router,
    private analysisValidationService: AnalysisValidationService) { }

  ngOnInit(): void {
    this.analysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    this.facility = this.facilityDbService.selectedFacility.getValue();
    this.energyUnit = this.facility.energyUnit;
    this.yearOptions = this.analysisCalculationsHelperService.getYearOptions();
  }

  async saveItem() {
    this.analysisItem.setupErrors = this.analysisValidationService.getAnalysisItemErrors(this.analysisItem);
    await this.analysisDbService.updateWithObservable(this.analysisItem).toPromise();
    this.analysisDbService.selectedAnalysisItem.next(this.analysisItem);
  }

  changeReportYear() {
    this.analysisItem = this.analysisService.setBaselineAdjustments(this.facility, this.analysisItem);
    this.saveItem();
  }

  async setSiteSource() {
    await this.saveItem();
    this.analysisService.setCalanderizedMeters();
  }

  continue() {
    this.router.navigateByUrl('/facility/' + this.facility.id + '/analysis/run-analysis/group-analysis/' + this.analysisItem.groups[0].idbGroupId + '/options');
  }
}
