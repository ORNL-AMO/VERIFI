import { Component, OnInit } from '@angular/core';
import { Month, Months } from 'src/app/shared/form-data/months';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbAnalysisItem, IdbFacility } from 'src/app/models/idb';
import { EnergyUnitOptions, UnitOption } from 'src/app/shared/unitOptions';
import * as _ from 'lodash';
import { AnalysisService } from '../../analysis.service';
import { Router } from '@angular/router';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { firstValueFrom } from 'rxjs';
import { VolumeLiquidOptions } from 'src/app/shared/unitOptions';
import { AnalysisValidationService } from 'src/app/shared/helper-services/analysis-validation.service';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { RegressionModelsService } from 'src/app/shared/shared-analysis/calculations/regression-models.service';
import { AnalysisGroup } from 'src/app/models/analysis';
import { IdbAccount } from 'src/app/models/idbModels/account';
@Component({
  selector: 'app-analysis-setup',
  templateUrl: './analysis-setup.component.html',
  styleUrls: ['./analysis-setup.component.css']
})
export class AnalysisSetupComponent implements OnInit {

  energyUnitOptions: Array<UnitOption> = EnergyUnitOptions;
  waterUnitOptions: Array<UnitOption> = VolumeLiquidOptions;
  months: Array<Month> = Months;

  facility: IdbFacility;
  analysisItem: IdbAnalysisItem;
  yearOptions: Array<number>;
  reportYears: Array<number>;
  baselineYearWarning: string;
  disableForm: boolean;
  showInUseMessage: boolean;
  hasModelsGenerated: boolean;
  displayEnableForm: boolean = false;
  displayChangeReportYear: boolean = false;
  newReportYear: number;
  constructor(private facilityDbService: FacilitydbService, private analysisDbService: AnalysisDbService,
    private analysisService: AnalysisService, private router: Router,
    private analysisValidationService: AnalysisValidationService,
    private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService,
    private calanderizationService: CalanderizationService,
    private accountAnalysisDbService: AccountAnalysisDbService,
    private regressionModelsService: RegressionModelsService) { }

  ngOnInit(): void {
    this.analysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    this.facility = this.facilityDbService.selectedFacility.getValue();
    this.yearOptions = this.calanderizationService.getYearOptionsFacility(this.facility.guid, this.analysisItem.analysisCategory);
    this.setReportYears();
    this.setBaselineYearWarning();
    this.setComponentBools();
  }

  async saveItem() {
    this.analysisItem.setupErrors = this.analysisValidationService.getAnalysisItemErrors(this.analysisItem);
    await firstValueFrom(this.analysisDbService.updateWithObservable(this.analysisItem));
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    await this.dbChangesService.setAnalysisItems(selectedAccount, false, selectedFacility);
    this.analysisDbService.selectedAnalysisItem.next(this.analysisItem);
  }

  async changeReportYear() {
    this.analysisItem = this.analysisService.setDataAdjustments(this.analysisItem);
    this.setBaselineYearWarning();
    if (!this.baselineYearWarning) {
      let allFacilityAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.facilityAnalysisItems.getValue();
      let selectYearAnalysis: boolean = true;
      allFacilityAnalysisItems.forEach(item => {
        if (item.reportYear == this.analysisItem.reportYear && item.selectedYearAnalysis) {
          selectYearAnalysis = false;
        }
      });
      this.analysisItem.selectedYearAnalysis = selectYearAnalysis;
    } else {
      this.analysisItem.selectedYearAnalysis = false;
    }
    this.setReportYears();
    await this.saveItem();
  }

  async setSiteSource() {
    await this.saveItem();
  }

  continue() {
    this.router.navigateByUrl('/facility/' + this.facility.id + '/analysis/run-analysis/group-analysis/' + this.analysisItem.groups[0].idbGroupId + '/options');
  }

  setBaselineYearWarning() {
    if (this.analysisItem.analysisCategory == 'water') {
      if (this.analysisItem.baselineYear && this.facility.sustainabilityQuestions.waterReductionGoal && this.facility.sustainabilityQuestions.waterReductionBaselineYear != this.analysisItem.baselineYear) {
        this.baselineYearWarning = "This baseline year does not match your facility baseline year. This analysis cannot be included in reports or figures relating to the facility water goal."
      } else {
        this.baselineYearWarning = undefined;
      }
    } else if (this.analysisItem.analysisCategory == 'energy') {
      if (this.analysisItem.baselineYear && this.facility.sustainabilityQuestions.energyReductionGoal && this.facility.sustainabilityQuestions.energyReductionBaselineYear != this.analysisItem.baselineYear) {
        this.baselineYearWarning = "This baseline year does not match your facility baseline year. This analysis cannot be included in reports or figures relating to the facility energy goal."
      } else {
        this.baselineYearWarning = undefined;
      }
    } else {
      this.baselineYearWarning = undefined;
    }
  }

  setComponentBools() {
    let accountAnalysisItems = this.accountAnalysisDbService.getCorrespondingAccountAnalysisItems(this.analysisItem.guid);
    if (accountAnalysisItems.length != 0 && this.analysisService.hideInUseMessage == false) {
      this.showInUseMessage = true;
    }
    let hasModelsGenerated: boolean = false;
    this.analysisItem.groups.forEach(group => {
      if (group.analysisType == 'regression') {
        if (group.models && group.models.length != 0) {
          hasModelsGenerated = true;
        }
      }
    });
    this.hasModelsGenerated = hasModelsGenerated;
    this.disableForm = this.hasModelsGenerated;
  }

  hideInUseMessage() {
    this.showInUseMessage = false;
    this.analysisService.hideInUseMessage = true;
  }

  showEnableForm() {
    this.displayEnableForm = true;
  }

  cancelEnableForm() {
    this.displayEnableForm = false;
  }

  async confirmEnableForm() {
    this.analysisItem.groups.forEach(group => {
      group.models = [];
      group.selectedModelId = undefined;
      group.regressionConstant = undefined;
      group.regressionModelYear = undefined;
      group.regressionConstant = undefined;
      group.predictorVariables.forEach(variable => {
        variable.regressionCoefficient = undefined;
      })
      group.groupErrors = this.analysisValidationService.getGroupErrors(group);
    });
    await this.saveItem();
    this.setComponentBools();
    this.displayEnableForm = undefined;
  }

  setReportYears() {
    if (this.analysisItem.baselineYear) {
      let modelYears: Array<number> = [this.analysisItem.baselineYear];

      this.analysisItem.groups.forEach(group => {
        if (group.analysisType == 'regression' && group.regressionModelYear) {
          modelYears.push(group.regressionModelYear);
        }
      });

      let minNeededModelYear: number = _.max(modelYears);

      this.reportYears = this.yearOptions.filter(year => {
        return year > minNeededModelYear;
      });
    } else {
      this.reportYears = [];
    }
  }

  showChangeReportYear() {
    this.newReportYear = this.analysisItem.reportYear;
    this.displayChangeReportYear = true;
  }

  cancelChangeReportYear() {
    this.displayChangeReportYear = false;
  }

  async saveNewReportYear() {
    this.analysisItem.reportYear = this.newReportYear;
    for (let i = 0; i < this.analysisItem.groups.length; i++) {
      let group: AnalysisGroup = this.analysisItem.groups[i];
      if (group.analysisType == 'regression') {
        for (let m = 0; m < group.models.length; m++) {
          this.analysisItem.groups[i].models[m] = this.regressionModelsService.updateModelReportYear(this.analysisItem.groups[i].models[m], this.analysisItem.reportYear, this.facility, this.analysisItem.baselineYear);
        }
      }
    }
    this.changeReportYear();
    this.displayChangeReportYear = false;
    await this.saveItem();
  }
}
