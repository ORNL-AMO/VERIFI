import { Component, Input, OnInit } from '@angular/core';
import { IdbUtilityMeterGroup } from 'src/app/models/idb';

@Component({
  selector: 'app-meter-group-chart',
  templateUrl: './meter-group-chart.component.html',
  styleUrls: ['./meter-group-chart.component.css']
})
export class MeterGroupChartComponent implements OnInit {
  @Input()
  meterGroup: IdbUtilityMeterGroup;

  constructor() { }

  ngOnInit(): void {
  }

}
