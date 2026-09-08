import { Component, inject, Input } from '@angular/core';
import { AccountWorkspaceStore } from '@app/data/account-workspace/account-workspace.store';
import { CalanderizedMeter, MonthlyData } from '@app/data/models/calanderization';
import { EmissionsResults } from '@app/data/models/eGridEmissions';
import { IdbAccount } from '@app/data/models/idbModels/account';

export interface AnnualMeterTotal extends EmissionsResults {
  year: number;
  energyConsumption: number;
  energyUse: number;
  energyCost: number;
}

@Component({
  selector: 'app-meter-annual-total-table',
  standalone: false,
  templateUrl: './meter-annual-total-table.component.html',
  styleUrl: './meter-annual-total-table.component.css',
})

export class MeterAnnualTotalTableComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

  @Input()
  calanderizedMeter: CalanderizedMeter;
  @Input()
  consumptionLabel: 'Consumption' | 'Distance';
  @Input()
  isRECs: boolean;

  account: IdbAccount;
  monthlyData: Array<MonthlyData>;
  annualTotals: Array<AnnualMeterTotal> = [];
  orderDataField: string = 'year';
  orderByDirection: 'asc' | 'desc' = 'asc';

  ngOnChanges() {
    this.account = this.accountWorkspaceStore.account();
    if (this.calanderizedMeter) {
      this.monthlyData = this.calanderizedMeter.monthlyData;
      this.annualTotals = this.getAnnualTotals();
    }
  }

  getAnnualTotals(): Array<AnnualMeterTotal> {
    const years = [...new Set(this.monthlyData.map(data => data.year))].sort((a, b) => a - b);
    return years.map(year => {
      const yearData = this.monthlyData.filter(data => data.year === year);
      return {
        year: year,
        energyConsumption: this.addData(yearData, 'energyConsumption'),
        energyUse: this.addData(yearData, 'energyUse'),
        energyCost: this.addData(yearData, 'energyCost'),
        totalWithMarketEmissions: this.addData(yearData, 'totalWithMarketEmissions'),
        totalWithLocationEmissions: this.addData(yearData, 'totalWithLocationEmissions'),
        RECs: this.addData(yearData, 'RECs'),
        excessRECs: this.addData(yearData, 'excessRECs'),
        excessRECsEmissions: this.addData(yearData, 'excessRECsEmissions'),
        stationaryBiogenicEmmissions: this.addData(yearData, 'stationaryBiogenicEmmissions'),
        stationaryCarbonEmissions: this.addData(yearData, 'stationaryCarbonEmissions'),
        stationaryOtherEmissions: this.addData(yearData, 'stationaryOtherEmissions'),
        stationaryEmissions: this.addData(yearData, 'stationaryEmissions'),
        fugitiveEmissions: this.addData(yearData, 'fugitiveEmissions'),
        processEmissions: this.addData(yearData, 'processEmissions'),
        mobileCarbonEmissions: this.addData(yearData, 'mobileCarbonEmissions'),
        mobileBiogenicEmissions: this.addData(yearData, 'mobileBiogenicEmissions'),
        mobileOtherEmissions: this.addData(yearData, 'mobileOtherEmissions'),
        mobileTotalEmissions: this.addData(yearData, 'mobileTotalEmissions'),
        locationElectricityEmissions: this.addData(yearData, 'locationElectricityEmissions'),
        marketElectricityEmissions: this.addData(yearData, 'marketElectricityEmissions'),
        otherScope2Emissions: this.addData(yearData, 'otherScope2Emissions'),
        scope2LocationEmissions: this.addData(yearData, 'scope2LocationEmissions'),
        scope2MarketEmissions: this.addData(yearData, 'scope2MarketEmissions'),
        totalScope1Emissions: this.addData(yearData, 'totalScope1Emissions'),
        totalBiogenicEmissions: this.addData(yearData, 'totalBiogenicEmissions')
      }
    })
  }

  private addData(data: Array<MonthlyData>, field: keyof MonthlyData): number {
    return data.reduce((total, entry) => total + (Number(entry[field]) || 0), 0);
  }

  setOrderDataField(str: string) {
    if (str == this.orderDataField) {
      if (this.orderByDirection == 'desc') {
        this.orderByDirection = 'asc';
      } else {
        this.orderByDirection = 'desc';
      }
    } else {
      this.orderDataField = str;
    }
  }

}
