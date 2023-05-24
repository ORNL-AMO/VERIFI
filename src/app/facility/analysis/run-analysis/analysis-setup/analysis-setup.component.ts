import { Component, OnInit } from '@angular/core';
import { Month, Months } from 'src/app/shared/form-data/months';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbAccount, IdbAnalysisItem, IdbFacility } from 'src/app/models/idb';
import { EnergyUnitOptions, UnitOption } from 'src/app/shared/unitOptions';
import * as _ from 'lodash';
import { AnalysisService } from '../../analysis.service';
import { Router } from '@angular/router';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { firstValueFrom } from 'rxjs';
import { AnalysisValidationService } from 'src/app/shared/helper-services/analysis-validation.service';
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
  baselineYearWarning: string;
  constructor(private facilityDbService: FacilitydbService, private analysisDbService: AnalysisDbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private analysisService: AnalysisService, private router: Router,
    private analysisValidationService: AnalysisValidationService,
    private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService) { }

  ngOnInit(): void {
    this.analysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    this.facility = this.facilityDbService.selectedFacility.getValue();
    this.energyUnit = this.facility.energyUnit;
    this.yearOptions = this.utilityMeterDataDbService.getYearOptions();
    this.setBaselineYearWarning();
  }

  async saveItem() {
    this.analysisItem.setupErrors = this.analysisValidationService.getAnalysisItemErrors(this.analysisItem);
    await firstValueFrom(this.analysisDbService.updateWithObservable(this.analysisItem));
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    await this.dbChangesService.setAnalysisItems(selectedAccount, selectedFacility);
    this.analysisDbService.selectedAnalysisItem.next(this.analysisItem);
  }

  changeReportYear() {
    this.analysisItem = this.analysisService.setBaselineAdjustments(this.analysisItem);
    this.setBaselineYearWarning();
    this.saveItem();
  }

  async setSiteSource() {
    await this.saveItem();
    this.analysisService.setCalanderizedMeters();
  }

  continue() {
    this.router.navigateByUrl('/facility/' + this.facility.id + '/analysis/run-analysis/group-analysis/' + this.analysisItem.groups[0].idbGroupId + '/options');
  }

  setBaselineYearWarning() {
    if (this.analysisItem.baselineYear && this.facility.sustainabilityQuestions.energyReductionBaselineYear != this.analysisItem.baselineYear) {
      this.baselineYearWarning = "This baseline year does not match your facility baseline year. This analysis cannot be included in reports or figures relating to the facility energy goal."
    }else{
      this.baselineYearWarning = undefined;
    }
  }


}
