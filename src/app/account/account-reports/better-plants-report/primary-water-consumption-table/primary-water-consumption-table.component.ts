import { Component, Input, OnInit } from '@angular/core';
import { IdbAccount, IdbAccountReport } from 'src/app/models/idb';
import { BetterPlantsSummary } from 'src/app/models/overview-report';

@Component({
  selector: 'app-primary-water-consumption-table',
  templateUrl: './primary-water-consumption-table.component.html',
  styleUrls: ['./primary-water-consumption-table.component.css']
})
export class PrimaryWaterConsumptionTableComponent {
  @Input()
  report: IdbAccountReport;
  @Input()
  account: IdbAccount;
  @Input()
  betterPlantsSummary: BetterPlantsSummary;

}
