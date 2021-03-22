import { Component, Input, OnInit } from '@angular/core';
import { IdbUtilityMeterData } from 'src/app/models/idb';

@Component({
  selector: 'app-invalid-meter-data-table',
  templateUrl: './invalid-meter-data-table.component.html',
  styleUrls: ['./invalid-meter-data-table.component.css']
})
export class InvalidMeterDataTableComponent implements OnInit {
  @Input()
  invalidReadings: Array<{ meterData: IdbUtilityMeterData, errors: Array<string> }>;
  @Input()
  isTemplateElectricity: boolean;

  constructor() { }

  ngOnInit(): void {
  }

}
