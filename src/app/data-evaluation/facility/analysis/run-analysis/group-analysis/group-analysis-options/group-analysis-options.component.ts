import { Component, OnInit } from '@angular/core';
import { Subscription, firstValueFrom } from 'rxjs';
import { AnalysisService } from 'src/app/data-evaluation/facility/analysis/analysis.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { Router } from '@angular/router';
import { AnalysisGroup } from 'src/app/models/analysis';
import { AnalysisValidationService } from 'src/app/shared/helper-services/analysis-validation.service';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { getCalanderizedMeterData } from 'src/app/calculations/calanderization/calanderizeMeters';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { getNeededUnits } from 'src/app/calculations/shared-calculations/calanderizationFunctions';
import { getLatestYearWithData } from 'src/app/calculations/shared-calculations/calculationsHelpers';

@Component({
  selector: 'app-group-analysis-options',
  templateUrl: './group-analysis-options.component.html',
  styleUrls: ['./group-analysis-options.component.css'],
  standalone: false
})
export class GroupAnalysisOptionsComponent implements OnInit {

  group: AnalysisGroup;
  selectedGroupSub: Subscription;
  showUnitsWarning: boolean;
  baselineYearOptions: Array<number>;
  analysisItem: IdbAnalysisItem;
  facility: IdbFacility;
  showInUseMessage: boolean;
  bankedAnalysisYears: Array<number>;
  bankedAnalysisItem: IdbAnalysisItem;
  bankedGroup: AnalysisGroup;
  hasModelsGenerated: boolean;
  displayEnableForm: boolean = false;

  dataEndYear: number;

  displayDataAdjustmentModal: boolean = false;
  dataAdjustmentYearOptions: Array<{ value: number, selected: boolean }>;
  deleteDataAdjustmentYear: number;

  displayBaselineAdjustmentModal: boolean = false;
  baselineAdjustmentYearOptions: Array<{ value: number, selected: boolean }>;
  deleteBaselineAdjustmentYear: number;

  constructor(private analysisService: AnalysisService, private analysisDbService: AnalysisDbService,
    private accountDbService: AccountdbService, private facilityDbService: FacilitydbService,
    private dbChangesService: DbChangesService,
    private analysisValidationService: AnalysisValidationService,
    private router: Router,
    private accountAnalysisDbService: AccountAnalysisDbService,
    private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService) { }

  ngOnInit(): void {
    this.facility = this.facilityDbService.selectedFacility.getValue();
    this.analysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    this.setShowInUseMessage();
    this.selectedGroupSub = this.analysisService.selectedGroup.subscribe(group => {
      this.group = group;
      this.setDataEndYear();
      this.setBaselineYearOptions();
      this.setAdjustmentYearOptions();
      if (this.analysisItem.hasBanking && this.group.applyBanking) {
        this.setBankedGroup();
        this.setBankedAnalysisYearOptions();
        this.setHasModelsGenerated();
      }
    });
  }

  ngOnDestroy() {
    this.selectedGroupSub.unsubscribe();
  }

  async saveItem() {
    let analysisItem: IdbAnalysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    analysisItem.isAnalysisVisited = false;
    let groupIndex: number = analysisItem.groups.findIndex(group => { return group.idbGroupId == this.group.idbGroupId });
    this.group.groupErrors = this.analysisValidationService.getGroupErrors(this.group, analysisItem);
    analysisItem.groups[groupIndex] = this.group;
    analysisItem.setupErrors = this.analysisValidationService.getAnalysisItemErrors(analysisItem);
    await firstValueFrom(this.analysisDbService.updateWithObservable(analysisItem));
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setAnalysisItems(selectedAccount, false, this.facility);
    this.analysisDbService.selectedAnalysisItem.next(analysisItem);
    this.analysisService.selectedGroup.next(this.group);
  }

  setAnalysisType() {
    if (this.group.analysisType != 'regression') {
      this.group.predictorVariables.forEach(variable => {
        if (!variable.production) {
          variable.productionInAnalysis = false;
        }
      });
    }
    this.changeModelType();
  }

  setExcludeGroup(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.group.analysisType = checked ? 'skip' : 'regression';
    this.setAnalysisType();
  }

  changeModelType() {
    this.group.models = undefined;
    this.group.selectedModelId = undefined;
    this.group.dateModelsGenerated = undefined;
    this.saveItem();
  }

  goToPredictors() {
    let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.router.navigateByUrl('/data-evaluation/facility/' + facility.guid + '/utility/predictors');
  }

  goToMeterGroups() {
    let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.router.navigateByUrl('/data-evaluation/facility/' + facility.guid + '/utility/meter-groups');
  }

  setShowInUseMessage() {
    let accountAnalysisItems = this.accountAnalysisDbService.getCorrespondingAccountAnalysisItems(this.analysisItem.guid);
    if (accountAnalysisItems.length != 0 && this.analysisService.hideInUseMessage == false) {
      this.showInUseMessage = true;
    }
  }

  hideInUseMessage() {
    this.showInUseMessage = false;
    this.analysisService.hideInUseMessage = true;
  }

  setDataEndYear() {
    let meters: Array<IdbUtilityMeter> = this.utilityMeterDbService.getGroupMetersByGroupId(this.group.idbGroupId);
    let meterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.getFacilityMeterDataByFacilityGuid(this.facility.guid);
    let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    let calanderizedMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(meters, meterData, facility, false, { energyIsSource: this.analysisItem.energyIsSource, neededUnits: getNeededUnits(this.analysisItem) }, [], [], [facility], 'AR6', []);
    this.dataEndYear = getLatestYearWithData(calanderizedMeters, [facility]);
  }

  setBaselineYearOptions() {
    this.baselineYearOptions = new Array();
    for (let i = this.analysisItem.baselineYear; i < this.dataEndYear; i++) {
      this.baselineYearOptions.push(i);
    }
  }

  setBankedAnalysisYearOptions() {
    this.bankedAnalysisYears = new Array();
    if (this.bankedAnalysisItem) {
      for (let i = this.bankedAnalysisItem.baselineYear + 1; i < this.dataEndYear; i++) {
        this.bankedAnalysisYears.push(i);
      }
    }
  }

  setBankedGroup() {
    this.bankedAnalysisItem = this.analysisDbService.getByGuid(this.analysisItem.bankedAnalysisItemId);
    this.bankedGroup = this.bankedAnalysisItem.groups.find(group => {
      return group.idbGroupId == this.group.idbGroupId;
    });
  }

  setHasModelsGenerated() {
    if (this.group.models && this.group.models.length > 0) {
      this.hasModelsGenerated = true;
    } else {
      this.hasModelsGenerated = false;
    }
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
    this.setHasModelsGenerated();
    this.cancelEnableForm();
  }

  setAdjustmentYearOptions() {
    //baselineYearOptions doesn't include end year
    let yearOptions: Array<{ value: number, selected: boolean }> = this.baselineYearOptions.map(year => { return { value: year, selected: false } });
    yearOptions.push({ value: this.dataEndYear, selected: false });
    let dataAdjustmentYears: Array<number> = this.group.dataAdjustments.map(adjustment => adjustment.year);
    this.dataAdjustmentYearOptions = yearOptions.filter(year => {
      if (!dataAdjustmentYears.includes(year.value)) {
        return year;
      }
    });
    let baselineAdjustmentYears: Array<number> = this.group.baselineAdjustmentsV2.map(adjustment => adjustment.year);
    this.baselineAdjustmentYearOptions = yearOptions.filter(year => {
      if (!baselineAdjustmentYears.includes(year.value)) {
        return year;
      }
    });
  }

  //DATA ADJUSTMENT
  openDataAdjustmentModal() {
    this.displayDataAdjustmentModal = true;
  }

  closeDataAdjustmentModal() {
    this.displayDataAdjustmentModal = false;
  }

  async addDataAdjustments() {
    this.dataAdjustmentYearOptions.forEach(yearOption => {
      if (yearOption.selected) {
        this.group.dataAdjustments.push({ year: yearOption.value, amount: 0 });
      }
    });
    this.group.dataAdjustments.sort((a, b) => a.year - b.year);
    await this.saveItem();
    this.closeDataAdjustmentModal();
  }

  openRemoveDataAdjustment(year: number) {
    this.deleteDataAdjustmentYear = year;
  }

  async closeRemoveDataAdjustment(removeAdjustment: boolean) {
    if (removeAdjustment) {
      this.group.dataAdjustments = this.group.dataAdjustments.filter(adjustment => adjustment.year != this.deleteDataAdjustmentYear);
      await this.saveItem();
    }
    this.deleteDataAdjustmentYear = undefined;
  }

  //BASELINE ADJUSTMENT
  openBaselineAdjustmentModal() {
    this.displayBaselineAdjustmentModal = true;
  }

  closeBaselineAdjustmentModal() {
    this.displayBaselineAdjustmentModal = false;
  }

  async addBaselineAdjustments() {
    this.baselineAdjustmentYearOptions.forEach(yearOption => {
      if (yearOption.selected) {
        this.group.baselineAdjustmentsV2.push({ year: yearOption.value, amount: 0 });
      }
    });
    this.group.baselineAdjustmentsV2.sort((a, b) => a.year - b.year);
    await this.saveItem();
    this.closeBaselineAdjustmentModal();
  }

  openRemoveBaselineAdjustment(year: number) {
    this.deleteBaselineAdjustmentYear = year;
  }

  async closeRemoveBaselineAdjustment(removeAdjustment: boolean) {
    if (removeAdjustment) {
      this.group.baselineAdjustmentsV2 = this.group.baselineAdjustmentsV2.filter(adjustment => adjustment.year != this.deleteBaselineAdjustmentYear);
      await this.saveItem();
    }
    this.deleteBaselineAdjustmentYear = undefined;
  }

  toggleAdjustmentOption(yearOption: { value: number, selected: boolean }) {
    yearOption.selected = !yearOption.selected;
  }
}
