import { Component, OnInit } from '@angular/core';
import { Month, Months } from 'src/app/shared/form-data/months';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { EnergyUnitOptions, UnitOption } from 'src/app/shared/unitOptions';
import * as _ from 'lodash';
import { AnalysisService } from '../../analysis.service';
import { ActivatedRoute, Router } from '@angular/router';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { firstValueFrom, Subscription } from 'rxjs';
import { VolumeLiquidOptions } from 'src/app/shared/unitOptions';
import { AnalysisValidationService } from 'src/app/shared/helper-services/analysis-validation.service';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { CalanderizedMeter } from 'src/app/models/calanderization';
@Component({
  selector: 'app-analysis-setup',
  templateUrl: './analysis-setup.component.html',
  styleUrls: ['./analysis-setup.component.css'],
  standalone: false
})
export class AnalysisSetupComponent implements OnInit {

  energyUnitOptions: Array<UnitOption> = EnergyUnitOptions;
  waterUnitOptions: Array<UnitOption> = VolumeLiquidOptions;
  months: Array<Month> = Months;

  facility: IdbFacility;
  analysisItem: IdbAnalysisItem;
  yearOptions: Array<number>;
  baselineYearWarning: string;
  disableForm: boolean;
  showInUseMessage: boolean;
  hasModelsGenerated: boolean;
  displayEnableForm: boolean = false;

  facilityAnalysisItems: Array<IdbAnalysisItem>;

  analysisItemSub: Subscription;
  isFormChange: boolean = false;
  account: IdbAccount;
  calanderizedMeters: Array<CalanderizedMeter>;
  calanderizedMetersSub: Subscription;

  constructor(private facilityDbService: FacilitydbService, private analysisDbService: AnalysisDbService,
    private analysisService: AnalysisService, private router: Router,
    private analysisValidationService: AnalysisValidationService,
    private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService,
    private calanderizationService: CalanderizationService,
    private accountAnalysisDbService: AccountAnalysisDbService,
    private activatedRoute: ActivatedRoute) { }

  ngOnInit(): void {
    this.account = this.accountDbService.selectedAccount.getValue();
    this.analysisItemSub = this.analysisDbService.selectedAnalysisItem.subscribe(item => {
      if (!this.isFormChange) {
        this.analysisItem = item;
        this.facility = this.facilityDbService.selectedFacility.getValue();
        this.setBaselineYearWarning();
        this.setComponentBools();
        this.setFacilityAnalysisItems();
      } else {
        this.isFormChange = false;
      }
    });
    this.calanderizedMetersSub = this.calanderizationService.calanderizedMeterData.subscribe(calanderizedMeters => {
      this.calanderizedMeters = calanderizedMeters;
      //TODO: use calanderized meters for year options
      this.yearOptions = this.calanderizationService.getYearOptions(this.analysisItem.analysisCategory, true, this.facility.guid);
    });
  }

  ngOnDestroy() {
    this.analysisItemSub.unsubscribe();
  }

  async saveItem() {
    this.isFormChange = true;
    await firstValueFrom(this.analysisDbService.updateWithObservable(this.analysisItem));
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    await this.dbChangesService.setAnalysisItems(selectedAccount, false, selectedFacility);
    this.analysisDbService.selectedAnalysisItem.next(this.analysisItem);
  }

  async changeBaselineYear() {
    this.setBaselineYearWarning();
    await this.saveItem();
  }

  async setSiteSource() {
    this.setFacilityAnalysisItems();
    await this.saveItem();
  }

  continue() {
    this.router.navigateByUrl('/data-evaluation/facility/' + this.facility.guid + '/analysis/run-analysis/group-analysis/' + this.analysisItem.groups[0].idbGroupId + '/options');
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
    });
    await this.saveItem();
    this.setComponentBools();
    this.displayEnableForm = undefined;
  }

  setFacilityAnalysisItems() {
    let facilityAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.facilityAnalysisItems.getValue();
    this.facilityAnalysisItems = facilityAnalysisItems.filter(analysisItem => {
      return analysisItem.energyIsSource == this.analysisItem.energyIsSource && analysisItem.guid != this.analysisItem.guid && analysisItem.analysisCategory == this.analysisItem.analysisCategory;
    });
    if (this.facilityAnalysisItems.length == 0) {
      this.analysisItem.hasBanking = false;
      this.analysisItem.bankedAnalysisItemId = undefined;
    }
  }

  async changeHasBanking() {
    if (this.analysisItem.hasBanking == false) {
      this.analysisItem.bankedAnalysisItemId = undefined;
    }
    await this.saveItem();
  }

  goToSavingsReport() {
    this.router.navigate(['../../../reports'], { relativeTo: this.activatedRoute });
  }

  goToSettings() {
    this.router.navigateByUrl('/data-evaluation/account/settings');
  }
}
