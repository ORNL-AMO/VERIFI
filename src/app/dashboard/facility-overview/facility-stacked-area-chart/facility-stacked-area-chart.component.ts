
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { Subscription } from 'rxjs';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbFacility, IdbUtilityMeter } from 'src/app/models/idb';
import { VisualizationService } from '../../../utility/visualization/visualization.service';

@Component({
  selector: 'app-facility-stacked-area-chart',
  templateUrl: './facility-stacked-area-chart.component.html',
  styleUrls: ['./facility-stacked-area-chart.component.css']
})
export class FacilityStackedAreaChartComponent implements OnInit {

  @ViewChild('stackedAreaChart', { static: false }) stackedAreaChart: ElementRef;

  facilityMeters: Array<IdbUtilityMeter>;
  electricityData: Array<{ time: string, energyUse: number, energyCost: number }>;
  naturalGasData: Array<{ time: string, energyUse: number, energyCost: number }>;
  otherFuelsData: Array<{ time: string, energyUse: number, energyCost: number }>;
  waterData: Array<{ time: string, energyUse: number, energyCost: number }>;
  wasteWaterData: Array<{ time: string, energyUse: number, energyCost: number }>;
  otherUtilityData: Array<{ time: string, energyUse: number, energyCost: number }>;
  sumByMonth: boolean = false;
  removeIncompleteYears: boolean = true;

  selectedFacility: IdbFacility;
  selectedFacilitySub: Subscription;
  accountMeterDataSub: Subscription;
  accountMeters: Array<IdbUtilityMeter>;
  accountMetersSub: Subscription;
  constructor(private plotlyService: PlotlyService, private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService, private vizualizationService: VisualizationService) { }

  ngOnInit(): void {
    this.accountMetersSub = this.utilityMeterDbService.accountMeters.subscribe(accountMeters => {
      this.accountMeters = accountMeters;
      this.setUtilityData();
    });
    this.selectedFacilitySub = this.utilityMeterDbService.facilityMeters.subscribe(facilityMeters => {
      this.facilityMeters = JSON.parse(JSON.stringify(facilityMeters));
      this.setUtilityData();
    });
    this.accountMeterDataSub = this.utilityMeterDataDbService.accountMeterData.subscribe(accountMeterData => {
      if (accountMeterData && accountMeterData.length != 0) {
        this.setUtilityData();
      }
    });
  }

  ngOnDestroy() {
    this.accountMeterDataSub.unsubscribe();
    this.selectedFacilitySub.unsubscribe();
    this.accountMetersSub.unsubscribe();
  }

  ngAfterViewInit() {
    this.setUtilityData();
  }

  setUtilityData() {
    if (this.facilityMeters && this.facilityMeters.length != 0 && this.accountMeters && this.accountMeters.length != 0) {
      this.electricityData = this.getDataByUtility('Electricity', this.facilityMeters);
      this.naturalGasData = this.getDataByUtility('Natural Gas', this.facilityMeters);
      this.otherFuelsData = this.getDataByUtility('Other Fuels', this.facilityMeters);
      this.waterData = this.getDataByUtility('Water', this.facilityMeters);
      this.wasteWaterData = this.getDataByUtility('Waste Water', this.facilityMeters);
      this.otherUtilityData = this.getDataByUtility('Other Utility', this.facilityMeters);
      this.drawChart();
    }
  }



  drawChart() {
    if (this.stackedAreaChart) {
      let traceData = new Array();
      if (this.electricityData.length != 0) {
        let trace = {
          x: this.electricityData.map(data => { return data.time }),
          y: this.electricityData.map(data => { return data.energyCost }),
          name: 'Electricity',
          stackgroup: 'one'
        }
        traceData.push(trace);
      }
      if (this.naturalGasData.length != 0) {
        let trace = {
          x: this.naturalGasData.map(data => { return data.time }),
          y: this.naturalGasData.map(data => { return data.energyCost }),
          name: 'Natural Gas',
          stackgroup: 'one'
        };
        traceData.push(trace);
      }
      if (this.otherFuelsData.length != 0) {
        let trace = {
          x: this.otherFuelsData.map(data => { return data.time }),
          y: this.otherFuelsData.map(data => { return data.energyCost }),
          name: 'Other Fuels',
          stackgroup: 'one'
        };
        traceData.push(trace);
      }
      if (this.waterData.length != 0) {
        let trace = {
          x: this.waterData.map(data => { return data.time }),
          y: this.waterData.map(data => { return data.energyCost }),
          name: 'Water',
          stackgroup: 'one'
        };
        traceData.push(trace);
      }
      if (this.wasteWaterData.length != 0) {
        let trace = {
          x: this.wasteWaterData.map(data => { return data.time }),
          y: this.wasteWaterData.map(data => { return data.energyCost }),
          name: 'Waste Water',
          stackgroup: 'one'
        };
        traceData.push(trace);
      }
      if (this.otherUtilityData.length != 0) {
        let trace = {
          x: this.otherUtilityData.map(data => { return data.time }),
          y: this.otherUtilityData.map(data => { return data.energyCost }),
          name: 'Other Utility',
          stackgroup: 'one'
        };
        traceData.push(trace);
      }
      var layout = {
        barmode: 'group',
        // title: {
        //   text: 'Utility Costs',
        //   font: {
        //     size: 24
        //   },
        // },
        xaxis: {
          autotick: false,
          // title: {
          //   text: 'Year',
          //   font: {
          //     size: 18
          //   },
          // },
        },
        yaxis: {
          // title: {
          //   text: 'Energy Cost',
          //   font: {
          //     size: 18
          //   },
          // },
          hoverformat: '$,.2f'
        }
      };
      var config = { responsive: true };
      this.plotlyService.newPlot(this.stackedAreaChart.nativeElement, traceData, layout, config);
    }
  }

  getDataByUtility(utility: string, facilityMeters: Array<IdbUtilityMeter>): Array<{ time: string, energyUse: number, energyCost: number }> {
    let filteredMeters: Array<IdbUtilityMeter> = facilityMeters.filter(meter => { return meter.source == utility });
    return this.vizualizationService.getFacilityBarChartData(filteredMeters, this.sumByMonth, this.removeIncompleteYears);
  }
}
