import { Component, Input, OnInit } from '@angular/core';
import { ReportOptions } from 'src/app/models/overview-report';

@Component({
  selector: 'app-primary-energy-consumption-table',
  templateUrl: './primary-energy-consumption-table.component.html',
  styleUrls: ['./primary-energy-consumption-table.component.css']
})
export class PrimaryEnergyConsumptionTableComponent implements OnInit {
  @Input()
  reportOptions: ReportOptions;
  
  constructor() { }

  ngOnInit(): void {
  }

}
