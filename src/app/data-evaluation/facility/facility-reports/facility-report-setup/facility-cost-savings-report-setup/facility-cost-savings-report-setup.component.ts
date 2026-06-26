import { Component } from '@angular/core';
import { Subscription, firstValueFrom } from 'rxjs';
import { getCalanderizedMeterData } from 'src/app/calculations/calanderization/calanderizeMeters';
import { ConvertValue } from 'src/app/calculations/conversions/convertValue';
import { getNeededUnits } from 'src/app/calculations/shared-calculations/calanderizationFunctions';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityReportsDbService } from 'src/app/indexedDB/facility-reports-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { AnalysisGroup } from 'src/app/models/analysis';
import { MonthlyData } from 'src/app/models/calanderization';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbFacilityReport, CostSavingsReportSettings, YearGroupData } from 'src/app/models/idbModels/facilityReport';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { Month, Months } from 'src/app/shared/form-data/months';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { getGroupUnit, getMeterCollectionUnit, getYearsArray } from 'src/app/shared/sharedHelperFunctions';

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

  filteredAnalysisItems: Array<IdbAnalysisItem>;
  yearsList: Array<number>;
  months: Array<Month> = Months;

  unitCostTable: YearGroupData = {};
  groupUnits: { [groupId: string]: string } = {};

  showModal: boolean = false;
  selectedGroup: AnalysisGroup;
  selectedYear: number;
  selectedYearError: boolean = false;
  calanderizedMetersSub: Subscription;

  groupMeterCalendarizedData: GroupMeterCalendarizedMap = {};
  missingCostData: { [meterId: string]: Date[] } = {};

  constructor(private facilityReportsDbService: FacilityReportsDbService,
    private analysisDbService: AnalysisDbService,
    private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService,
    private calanderizationService: CalanderizationService,
    private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService) {
  }

  ngOnInit() {
    this.facilityReportSub = this.facilityReportsDbService.selectedReport.subscribe(report => {
      this.facilityReport = report;
      this.reportSettings = this.facilityReport.costSavingsReportSettings;
      if (this.reportSettings && this.reportSettings.unitCostTable) {
        this.unitCostTable = this.reportSettings.unitCostTable ? JSON.parse(JSON.stringify(this.reportSettings.unitCostTable)) : {};
      }
    });

    this.analysisItemsSub = this.analysisDbService.facilityAnalysisItems.subscribe(items => {
      this.analysisItems = items.filter(item => (item.analysisCategory == 'water') || (item.analysisCategory == 'energy' && !item.energyIsSource));
    });

    this.calanderizedMetersSub = this.calanderizationService.calanderizedMeters.subscribe(() => {
      this.setYearOptions();
    });

    this.setSelectedAnalysisItem();
  }

  ngOnDestroy() {
    this.facilityReportSub.unsubscribe();
    this.calanderizedMetersSub.unsubscribe();
    this.analysisItemsSub.unsubscribe();
  }

  onSelectedAnalysisItemChange(item: IdbAnalysisItem) {
    this.selectedAnalysisItem = item;
    this.checkSelectedYearError();
    this.clearUnitCostData();
    this.updateReportSettings();
  }

  onFilteredItemsChange(items: Array<IdbAnalysisItem>) {
    this.filteredAnalysisItems = items;
  }

  async setSelectedAnalysisItem() {
    this.selectedAnalysisItem = this.analysisItems.find(item => {
      return item.guid == this.facilityReport.analysisItemId;
    });
    this.checkSelectedYearError();
  }

  checkSelectedYearError() {
    if (this.selectedAnalysisItem) {
      if (this.selectedAnalysisItem.baselineYear <= this.reportSettings.endYear) {
        this.selectedYearError = false;
        this.setTableYears();
        this.setGroupUnits();
      }
      else {
        this.selectedYearError = true;
      }
    }
  }

  async reportYearChanged() {
    if (this.selectedAnalysisItem) {
      if (this.selectedAnalysisItem.baselineYear <= this.reportSettings.endYear) {
        this.selectedYearError = false;
        this.setTableYears();
        this.setGroupUnits();
      } else {
        this.selectedYearError = true;
      }
    }
    this.updateReportSettings();
  }

  async save() {
    this.facilityReport = await firstValueFrom(this.facilityReportsDbService.updateWithObservable(this.facilityReport));
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    await this.dbChangesService.setAccountFacilityReports(selectedAccount, selectedFacility);
    this.facilityReportsDbService.selectedReport.next(this.facilityReport);
  }

  setYearOptions() {
    let yearOptions: Array<number> = this.calanderizationService.getYearOptions('all', false, this.facilityReport.facilityId);
    this.reportYears = yearOptions;
    this.baselineYears = yearOptions;
  }

  setTableYears() {
    this.yearsList = getYearsArray(this.selectedAnalysisItem.baselineYear, this.reportSettings.endYear);
    this.setCostValues();
  }

  clearUnitCostData() {
    if (this.yearsList && this.selectedAnalysisItem) {
      for (let year of this.yearsList) {
        for (const group of this.selectedAnalysisItem.groups) {
          this.unitCostTable[year][group.idbGroupId] = null;
        }
      }
    }
    this.missingCostData = {};
  }

  setGroupMeterCalendarizedData() {
    const facilityMeterData = this.utilityMeterDataDbService.facilityMeterData.getValue();
    const facilityMeters = this.utilityMeterDbService.facilityMeters.getValue();
    const selectedFacility = this.facilityDbService.selectedFacility.getValue();
    const account = this.accountDbService.selectedAccount.getValue();

    this.groupMeterCalendarizedData = {};
    if (!this.selectedAnalysisItem) return;

    this.selectedAnalysisItem.groups.forEach(group => {
      const groupMeters = facilityMeters.filter(m => m.groupId == group.idbGroupId);

      const calanderizedMeters = getCalanderizedMeterData(
        groupMeters,
        facilityMeterData,
        selectedFacility,
        false,
        { energyIsSource: false, neededUnits: getNeededUnits(this.selectedAnalysisItem) },
        [],
        [],
        [selectedFacility],
        account.assessmentReportVersion,
        []
      );

      const meterMap: { [meterId: string]: MeterCalendarizedData } = {};
      calanderizedMeters.forEach(cMeter => {
        meterMap[cMeter.meter.guid] = {
          unit: getMeterCollectionUnit(cMeter.meter),
          monthlyData: cMeter.monthlyData
        };
      });

      this.groupMeterCalendarizedData[group.idbGroupId] = meterMap;
    });
  }

  setCostValues() {
    for (let year of this.yearsList) {
      if (!this.unitCostTable[year]) {
        this.unitCostTable[year] = {};
      }
      for (const group of this.selectedAnalysisItem.groups) {
        if (this.unitCostTable[year][group.idbGroupId] === undefined) {
          this.unitCostTable[year][group.idbGroupId] = null;
        }
      }
    }
  }

  setGroupUnits() {
    this.groupUnits = {};
    for (const group of this.selectedAnalysisItem.groups) {
      this.groupUnits[group.idbGroupId] = this.checkUnit(group);
    }
    this.reportSettings.groupUnits = { ...this.groupUnits };
  }

  checkUnit(group: AnalysisGroup): string {
    const facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
    const groupMeters: Array<IdbUtilityMeter> = facilityMeters.filter(meter => {
      return group.idbGroupId == meter.groupId;
    });
    return getGroupUnit(groupMeters, this.selectedAnalysisItem);
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
      this.unitCostTable[this.selectedYear][this.selectedGroup.idbGroupId] = blendedRate;
      this.updateReportSettings();
    }
    this.showModal = false;
  }

  updateReportSettings() {
    this.reportSettings.unitCostTable = JSON.parse(JSON.stringify(this.unitCostTable));
    this.reportSettings.isDataComplete = this.isDataComplete();
    this.save();
  }

  isDataComplete(): boolean {
    if (this.yearsList) {
      for (let year of this.yearsList) {
        for (const group of this.filteredGroups) {
          const cost = this.unitCostTable[year][group.idbGroupId];
          if (cost === null || cost === undefined || isNaN(cost)) {
            return false;
          }
        }
      }
      return true;
    }
    return false;
  }

  get filteredGroups() {
    return this.selectedAnalysisItem.groups.filter(group => group.analysisType != 'skip' && group.analysisType != 'skipAnalysis');
  }

  calculateCostFromCalendarizedMeters() {
    this.missingCostData = {};
    this.setGroupMeterCalendarizedData();
    for (let year of this.yearsList) {
      for (const group of this.filteredGroups) {
        const groupCalendarizedMeters = this.groupMeterCalendarizedData[group.idbGroupId];
        let totalEnergyCost = 0;
        let totalEnergyConsumption = 0;

        for (const meterId in groupCalendarizedMeters) {
          const meterData = groupCalendarizedMeters[meterId].monthlyData.filter(m => m.year == year);
          meterData.forEach(m => {
            if (m.energyCost == 0) {
              if (!this.missingCostData[meterId]) {
                this.missingCostData[meterId] = [];
              }
              this.missingCostData[meterId].push(m.date);
            }
            totalEnergyCost += m.energyCost;
            const converted = new ConvertValue(m.energyConsumption, getNeededUnits(this.selectedAnalysisItem), groupCalendarizedMeters[meterId].unit).convertedValue;
            totalEnergyConsumption += isNaN(converted) ? 0 : converted;
          });
        }

        const blendedRate = totalEnergyConsumption > 0 ? totalEnergyCost / totalEnergyConsumption : 0;
        this.unitCostTable[year][group.idbGroupId] = Math.round(blendedRate * 100) / 100;
      }
    }
    this.updateReportSettings();
  }

  getMeterName(meterId: string): string {
    const facilityMeters = this.utilityMeterDbService.facilityMeters.getValue();
    const meter = facilityMeters.find(m => m.guid == meterId);
    return meter ? meter.name : '';
  }
}

interface MeterCalendarizedData {
  unit: string,
  monthlyData: Array<MonthlyData>
}

type GroupMeterCalendarizedMap = {
  [groupId: string]: {
    [meterId: string]: MeterCalendarizedData
  }
}