import { Component, Input, OnInit } from '@angular/core';
import { IdbAccount } from 'src/app/models/idb';
import { BetterPlantsSummary, ReportOptions } from 'src/app/models/overview-report';
import * as _ from 'lodash';

@Component({
  selector: 'app-primary-energy-consumption-table',
  templateUrl: './primary-energy-consumption-table.component.html',
  styleUrls: ['./primary-energy-consumption-table.component.css']
})
export class PrimaryEnergyConsumptionTableComponent implements OnInit {
  @Input()
  reportOptions: ReportOptions;
  @Input()
  account: IdbAccount;
  @Input()
  betterPlantsSummary: BetterPlantsSummary;



  otherGasFuels: Array<string>;
  otherLiquidFuels: Array<string>;
  otherSolidFuels: Array<string>;
  otherEnergyFuels: Array<string>;
  constructor() { }

  ngOnInit(): void {
    this.setBaselineOtherFuels();
  }


  setBaselineOtherFuels() {
    this.otherGasFuels = _.uniq(this.betterPlantsSummary.baselineYearResults.otherGasFuels);
    this.otherLiquidFuels = _.uniq(this.betterPlantsSummary.baselineYearResults.otherLiquidFuels);
    this.otherSolidFuels = _.uniq(this.betterPlantsSummary.baselineYearResults.otherSolidFuels);
    this.otherEnergyFuels = _.uniq(this.betterPlantsSummary.baselineYearResults.otherEnergyTypes);
  }

}
