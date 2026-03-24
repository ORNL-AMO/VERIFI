import { Component } from '@angular/core';
import { Subscription, firstValueFrom } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityReportsDbService } from 'src/app/indexedDB/facility-reports-db.service';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { AnalysisGroup } from 'src/app/models/analysis';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbFacilityReport, CostSavingsReportSettings } from 'src/app/models/idbModels/facilityReport';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';

@Component({
  selector: 'app-facility-cost-savings-report-setup',
  standalone: false,
  templateUrl: './facility-cost-savings-report-setup.component.html',
  styleUrl: './facility-cost-savings-report-setup.component.css',
})
export class FacilityCostSavingsReportSetupComponent {

  facilityReport: IdbFacilityReport;
  facilityReportSub: Subscription;

  analysisItems: Array<IdbAnalysisItem>;
  analysisItemsSub: Subscription;

  selectedAnalysisItem: IdbAnalysisItem;

  reportYears: Array<number>;
  reportSettings: CostSavingsReportSettings;
  baselineYears: Array<number>;
  selectedBaselineYear: number | 'All' = 'All';
  selectedCategory: string = 'All';
  filteredAnalysisItems: Array<IdbAnalysisItem>;
  yearsList: Array<number>;

  hasDataChanged: boolean = false;
  noValidItem: boolean;
  costTableData: { [year: number]: { [groupId: string]: number } } = {};
  groupUnits: { [groupId: string]: string } = {};

  showModal: boolean = false;
  selectedGroup: AnalysisGroup;
  selectedYear: number;

  constructor(private facilityReportsDbService: FacilityReportsDbService,
    private analysisDbService: AnalysisDbService,
    private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService,
    private calanderizationService: CalanderizationService,
    private predictorDataDbService: PredictorDataDbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private utilityMeterDbService: UtilityMeterdbService) {
  }

  ngOnInit() {
    this.facilityReportSub = this.facilityReportsDbService.selectedReport.subscribe(report => {
      this.facilityReport = report;
      this.reportSettings = this.facilityReport.costSavingsReportSettings;
      if (this.reportSettings && this.reportSettings.costSavingsTable) {
        this.costTableData = this.reportSettings.costSavingsTable;
      }
    });

    this.analysisItemsSub = this.analysisDbService.facilityAnalysisItems.subscribe(items => {
      this.analysisItems = items.filter(item => (item.analysisCategory == 'water') || (item.analysisCategory == 'energy' && !item.energyIsSource));
      if (this.analysisItems && this.analysisItems.length == 0) {
        this.noValidItem = true;
      }
      this.applyFilters();
    });
    this.setYearOptions();
    this.setSelectedAnalysisItem(true);
    if (this.selectedAnalysisItem) {
      this.setTableYears();
      this.checkModelData();
      this.setGroupUnits();
    }
  }

  ngOnDestroy() {
    this.facilityReportSub.unsubscribe();
    this.analysisItemsSub.unsubscribe();
  }

  checkModelData() {
    this.hasDataChanged = false;
    if (this.selectedAnalysisItem?.dataCheckedDate) {
      let dataCheckDate: Date = new Date(this.selectedAnalysisItem?.dataCheckedDate);
      let facilityPredictorEntries: Array<IdbPredictorData> = this.predictorDataDbService.facilityPredictorData.getValue();

      let hasDataChanged = facilityPredictorEntries.find(predictor => {
        return new Date(predictor.modifiedDate) > dataCheckDate
      });
      if (hasDataChanged) {
        this.hasDataChanged = true;
        this.saveAnalysisVisitedData();
      } else {
        let facilityMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.facilityMeterData.getValue();
        let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();

        let groupMeters: Array<IdbUtilityMeter> = this.selectedAnalysisItem.groups.flatMap(group => {
          return facilityMeters.filter(meter => meter.groupId == group.idbGroupId);
        });
        let groupMeterIds: Array<string> = groupMeters.map(meter => meter.guid);
        let groupMeterData: Array<IdbUtilityMeterData> = facilityMeterData.filter(meterData => groupMeterIds.includes(meterData.meterId));

        let hasDataChanged = groupMeterData.some(meterData => new Date(meterData.dbDate) > dataCheckDate);
        if (hasDataChanged) {
          this.hasDataChanged = true;
          this.saveAnalysisVisitedData();
        }
      }
    }
  }

  async saveAnalysisVisitedData() {
    this.selectedAnalysisItem.isAnalysisVisited = false;
    await firstValueFrom(this.analysisDbService.updateWithObservable(this.selectedAnalysisItem));
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    await this.dbChangesService.setAnalysisItems(account, false, selectedFacility);
    this.analysisDbService.selectedAnalysisItem.next(this.selectedAnalysisItem);
  }

  async setSelectedAnalysisItem(onInit: boolean) {
    this.selectedAnalysisItem = this.analysisItems.find(item => {
      return item.guid == this.facilityReport.analysisItemId;
    });
    if (!onInit) {
      await this.save();
    }
    if (this.selectedAnalysisItem) {
      this.setTableYears();
      this.checkModelData();
      this.setGroupUnits();
    }
  }

  async reportYearChanged() {
    this.setTableYears();
    this.save();
  }

  async save() {
    this.facilityReport = await firstValueFrom(this.facilityReportsDbService.updateWithObservable(this.facilityReport));
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    await this.dbChangesService.setAccountFacilityReports(selectedAccount, selectedFacility);
    this.facilityReportsDbService.selectedReport.next(this.facilityReport);
  }

  setYearOptions() {
    let yearOptions: Array<number> = this.calanderizationService.getYearOptions('all', true, this.facilityReport.facilityId);
    this.reportYears = yearOptions;
    this.baselineYears = yearOptions;
  }

  applyFilters() {
    this.filteredAnalysisItems = [...this.analysisItems];
    if (this.selectedBaselineYear != 'All') {
      this.filteredAnalysisItems = this.filteredAnalysisItems.filter(item => { return item.baselineYear == this.selectedBaselineYear });
    }
    if (this.selectedCategory != 'All') {
      this.filteredAnalysisItems = this.filteredAnalysisItems.filter(item => { return item.analysisCategory == this.selectedCategory });
    }
  }

  onOptionChange() {
    this.applyFilters();
    this.setSelectedAnalysisItem(true);
    this.setTableYears();
  }

  setTableYears() {
    this.yearsList = [];
    if (this.selectedAnalysisItem && this.reportSettings.reportYear) {
      for (let year = this.selectedAnalysisItem.baselineYear; year <= this.reportSettings.reportYear; year++) {
        this.yearsList.push(year);
      }
    }
    this.setCostValues();
    this.setGroupUnits();
  }

  setCostValues() {
    for (let year of this.yearsList) {
      if (!this.costTableData[year]) {
        this.costTableData[year] = {};
      }
      for (const group of this.selectedAnalysisItem.groups) {
        if (this.costTableData[year][group.idbGroupId] === undefined) {
          this.costTableData[year][group.idbGroupId] = null;
        }
      }
    }
  }

  setGroupUnits() {
    this.groupUnits = {};
    for (const group of this.selectedAnalysisItem.groups) {
      this.groupUnits[group.idbGroupId] = this.checkUnit(group);
      let groupMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue().filter(meter => meter.groupId == group.idbGroupId);
      if (groupMeters.length > 1) {
        this.groupUnits[group.idbGroupId] = '$/MMBtu';
      }
    }
  }

  checkUnit(group: AnalysisGroup): string {
    let unit: string;
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
    let groupMeters: Array<IdbUtilityMeter> = facilityMeters.filter(meter => {
      return group.idbGroupId == meter.groupId;
    });
    if (groupMeters.length > 1) {
      let isSameUnit = groupMeters.every(meter => meter.startingUnit == groupMeters[0].startingUnit);
      if (isSameUnit) {
        unit = '$/' + groupMeters[0].startingUnit; 
      }
      else {
        unit = '$/' + this.selectedAnalysisItem?.energyUnit; 
      }
    }
    else if (groupMeters.length == 1) {
      unit = '$/' + groupMeters[0].startingUnit; 
    }
    return unit;
  }

  hasMultipleMeters(group: AnalysisGroup): boolean {
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
    let groupMeters: Array<IdbUtilityMeter> = facilityMeters.filter(meter => {
      return group.idbGroupId == meter.groupId;
    });
    return groupMeters.length > 1;
  }

  openCalculator(group: AnalysisGroup, year: number) {
    this.selectedGroup = group;
    this.selectedYear = year;
    this.showModal = true;
  }

  closeCalculator() {
    this.showModal = false;
  }

  updateBlendedRate(blendedRate: number) {
    if (this.selectedGroup && this.selectedYear) {
      this.costTableData[this.selectedYear][this.selectedGroup.idbGroupId] = blendedRate;
      this.updateReportSettings();
    }
    this.showModal = false;
  }

  updateReportSettings() {
    this.reportSettings.costSavingsTable = { ...this.costTableData };
    this.reportSettings.groupUnits = { ...this.groupUnits };
    this.save();
  }
}