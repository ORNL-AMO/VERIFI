import { Component, inject, Input } from '@angular/core';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { getStatistics, Statistics } from '@v0/shared/shared-data-quality-report-meters/meterDataQualityStatistics';
import { Router } from '@angular/router';
import { getDateFromMeterData } from '@shared/dateHelperFunctions';
import { AccountWorkspaceStore } from '@app/data/account-workspace/account-workspace.store';
import { EGridService } from '@app/shared/helper-services/e-grid.service';
import { CalanderizedMeter } from '@app/data/models/calanderization';
import { IdbAccount } from '@app/data/models/idbModels/account';
import { IdbCustomFuel } from '@app/data/models/idbModels/customFuel';
import { IdbCustomGWP } from '@app/data/models/idbModels/customGWP';
import { IdbFacility } from '@app/data/models/idbModels/facility';
import { getCalanderizedMeterData } from '@app/domain/calculations/calanderization/calanderizeMeters';

@Component({
  selector: 'app-meter-data-quality-report',
  standalone: false,
  templateUrl: './meter-data-quality-report.component.html',
  styleUrl: './meter-data-quality-report.component.css'
})
export class MeterDataQualityReportComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private readonly eGridService = inject(EGridService);

  @Input({ required: true })
  selectedMeter: IdbUtilityMeter;
  @Input({ required: true })
  meterData: Array<IdbUtilityMeterData>;

  energyOutlierCount: number = 0;
  costOutlierCount: number = 0;
  showAlert: boolean = false;
  energyStats: Statistics;
  costStats: Statistics;

  includeCosts: boolean = true;
  hasData: boolean;

  datesList: Array<{ monthYear: string }> = [];

  calanderizedMeter: CalanderizedMeter;
  consumptionLabel: 'Consumption' | 'Distance';
  isRECs: boolean;

  constructor(private router: Router) { }

  ngOnChanges() {
    this.setStatistics();
    this.setCalanderizedMeterData();
  }

  setStatistics() {
    if (this.meterData.length === 0) {
      this.hasData = false;
    } else {
      this.hasData = true;
      const { energyStats, costStats } = getStatistics(this.meterData, this.selectedMeter);
      this.energyStats = energyStats;
      this.costStats = costStats;
      this.includeCosts = isNaN(this.costStats.average) == false && this.costStats.average != 0;
      this.energyOutlierCount = energyStats.outliers;
      this.costOutlierCount = costStats.outliers;
      this.checkMultipleReadings();
      if (this.energyOutlierCount > 0 || this.costOutlierCount > 0 || this.datesList.length > 0) {
        this.showAlert = true;
      } else {
        this.showAlert = false;
      }
    }
  }

  setCalanderizedMeterData() {
    if (!this.selectedMeter) {
      return;
    }

    let customFuels: Array<IdbCustomFuel> = [...this.accountWorkspaceStore.customFuels()];
    let selectedAccount: IdbAccount = this.accountWorkspaceStore.account();
    let customGWPs: Array<IdbCustomGWP> = [...this.accountWorkspaceStore.customGWPs()];
    let selectedFacility: IdbFacility = this.accountWorkspaceStore.selectedFacility();

    let allCalanderizedMeterData: Array<CalanderizedMeter> = getCalanderizedMeterData(
      [this.selectedMeter],
      this.meterData,
      selectedFacility,
      false,
      undefined,
      this.eGridService.co2Emissions,
      customFuels,
      [selectedFacility],
      selectedAccount.assessmentReportVersion,
      customGWPs);

    this.calanderizedMeter = allCalanderizedMeterData.find(cMeter => cMeter.meter.guid == this.selectedMeter.guid);
    this.consumptionLabel = this.selectedMeter.scope != 2 ? 'Consumption' : 'Distance';
    if (this.selectedMeter.source != 'Electricity') {
      this.isRECs = false;
    } else {
      this.isRECs = (this.selectedMeter.agreementType == 4 || this.selectedMeter.agreementType == 6);
    }
  }

  checkMultipleReadings() {
    let dateCount: { [key: string]: number } = {};
    this.meterData.forEach(data => {
      let date = getDateFromMeterData(data);
      let month = date.toLocaleString('default', { month: 'short' });
      let year = date.getFullYear();
      let monthYear = `${month}, ${year}`;
      if (dateCount[monthYear]) {
        dateCount[monthYear]++;
      } else {
        dateCount[monthYear] = 1;
      }
    });
    this.datesList = Object.keys(dateCount).filter(key => dateCount[key] > 1)
      .map(key => {
        return { monthYear: key };
      });
  }

  meterDataAdd() {
    this.router.navigateByUrl('/data-management/' + this.selectedMeter.accountId + '/facilities/' + this.selectedMeter.facilityId + '/meters/' + this.selectedMeter.guid + '/meter-data/new-bill');

  }

  uploadData() {
    this.router.navigateByUrl('/data-management/' + this.selectedMeter.accountId + '/import-data');
  }
}
