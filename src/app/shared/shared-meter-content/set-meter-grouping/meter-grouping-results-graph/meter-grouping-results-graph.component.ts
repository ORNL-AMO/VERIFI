import { Component, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PlotlyService } from 'angular-plotly.js';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { CalanderizedMeter, MonthlyData } from 'src/app/models/calanderization';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeterGroup } from 'src/app/models/idbModels/utilityMeterGroup';
import * as _ from 'lodash';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { Subscription } from 'rxjs';
import { MeterGroupingDataService } from '../meter-grouping-data.service';

@Component({
  selector: 'app-meter-grouping-results-graph',
  standalone: false,
  templateUrl: './meter-grouping-results-graph.component.html',
  styleUrls: ['./meter-grouping-results-graph.component.css'],
})
export class MeterGroupingResultsGraphComponent {
  meterGroup: IdbUtilityMeterGroup;

  calanderizedMeters: Array<CalanderizedMeter>;
  calanderizedMetersSub: Subscription;
  groupMonthlyData: Array<MonthlyData>;
  energyUnit: string;

  showConsumption: boolean = true;
  showEnergyUse: boolean = true;
  showCost: boolean = true;

  displayGraphCost: "bar" | "scatter" | null = 'bar';
  displayGraphEnergy: "bar" | "scatter" | null = 'bar';

  @ViewChild('groupMeterDataChart', { static: false }) groupMeterDataChart: ElementRef;
  selectedFacility: IdbFacility;

  calculatingMeterGroups: boolean | 'error' = false;
  calculatingMeterGroupsSub: Subscription;
  constructor(private activatedRoute: ActivatedRoute,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService,
    private router: Router,
    private facilityDbService: FacilitydbService,
    private plotlyService: PlotlyService,
    private dbChangesService: DbChangesService,
    private meterGroupingDataService: MeterGroupingDataService
  ) { }

  ngOnInit() {
    this.activatedRoute.params.subscribe(params => {
      let meterGroupId: string = params['id'];
      this.meterGroup = this.utilityMeterGroupDbService.getGroupById(meterGroupId);
      if (!this.meterGroup) {
        this.cancel();
      }
    });
    this.calculatingMeterGroupsSub = this.meterGroupingDataService.calanderizingMeterData.subscribe(calculating => {
      this.calculatingMeterGroups = calculating;
    });
    this.calanderizedMetersSub = this.meterGroupingDataService.calanderizedMeters.subscribe(calanderizedMeters => {
      if (calanderizedMeters.length > 0) {
        this.setCalanderizedMeterData(calanderizedMeters);
      }
    });
  }

  ngOnDestroy() {
    this.calanderizedMetersSub.unsubscribe();
    this.calculatingMeterGroupsSub.unsubscribe();
  }

  ngAfterViewInit() {
    this.drawChart();
  }

  cancel() {
    this.router.navigate(['../..'], { relativeTo: this.activatedRoute });
  }

  viewGroupDataTable() {
    this.router.navigate(['../../data-table/' + this.meterGroup.guid], { relativeTo: this.activatedRoute });
  }

  editGroup() {
    this.router.navigate(['../../edit-group/' + this.meterGroup.guid], { relativeTo: this.activatedRoute });
  }

  setCalanderizedMeterData(calanderizedMeters: Array<CalanderizedMeter>) {
    this.calanderizedMeters = calanderizedMeters.filter(cMeter => {
      return cMeter.meter.groupId == this.meterGroup.guid;
    });
    this.selectedFacility = this.facilityDbService.selectedFacility.getValue();

    this.energyUnit = this.selectedFacility.energyUnit;
    this.groupMonthlyData = this.calanderizedMeters.flatMap(meter => { return meter.monthlyData });
    //combine monthly data for meters in group with same month and year
    this.groupMonthlyData = this.groupMonthlyData.reduce((acc, monthlyData) => {
      let existingData = acc.find(data => { return data.month == monthlyData.month && data.year == monthlyData.year });
      if (existingData) {
        existingData.energyUse += monthlyData.energyUse;
        existingData.energyCost += monthlyData.energyCost;
        existingData.energyConsumption += monthlyData.energyConsumption;
      } else {
        acc.push({ ...monthlyData });
      }
      return acc;
    }, new Array<MonthlyData>());

    //check energy use and cost
    if (this.meterGroup.groupType == 'Energy') {
      this.showEnergyUse = this.groupMonthlyData.some(data => { return data.energyUse > 0 });
    } else {
      this.showEnergyUse = false;
    }
    if (this.meterGroup.groupType == 'Water') {
      this.showConsumption = this.groupMonthlyData.some(data => { return data.energyConsumption > 0 });
    } else {
      this.showConsumption = false;
    }
    this.showCost = this.groupMonthlyData.some(data => { return data.energyCost > 0 });
    this.drawChart();
  }


  setDisplayGraphEnergy(str: "bar" | "scatter") {
    if (str == this.displayGraphEnergy) {
      this.displayGraphEnergy = undefined;
    } else {
      this.displayGraphEnergy = str;
    }
    this.drawChart();
  }

  setDisplayGraphCost(str: "bar" | "scatter") {
    if (str == this.displayGraphCost) {
      this.displayGraphCost = undefined;
    } else {
      this.displayGraphCost = str;
    }
    this.drawChart();
  }


  drawChart() {
    if (this.groupMeterDataChart && this.calanderizedMeters && this.calanderizedMeters.length > 0) {
      let traceData = new Array();
      let yAxisTitle: string;
      let yAxis2Title: string;
      let hoverformat: string;
      let hoverformat2: string;
      let yaxis: string = 'y';
      let offsetgroup: number = 1;
      let costLine: { width: number };
      let energyLine: { width: number };
      let y1overlay: string;
      let y2overlay: string = 'y';

      let yAxisDtick: number;
      let yAxis2Dtick: number;

      if (this.displayGraphCost == 'scatter') {
        costLine = { width: 5 }
      }

      if (this.displayGraphEnergy == 'scatter') {
        energyLine = { width: 5 }

      }

      if (this.displayGraphEnergy == 'scatter' && this.displayGraphCost == 'bar') {
        y2overlay = undefined;
        y1overlay = 'y2';
      }


      if (this.displayGraphEnergy && (this.showEnergyUse || this.showConsumption)) {
        let yData: Array<number>;
        hoverformat = ',.0f'
        if (!this.showEnergyUse) {
          yAxisTitle = 'Utility Consumption (' + this.selectedFacility.volumeLiquidUnit + ')';
          yData = this.groupMonthlyData.map(data => { return data.energyConsumption })
        } else {
          yAxisTitle = 'Utility Consumption (' + this.selectedFacility.energyUnit + ')';
          yData = this.groupMonthlyData.map(data => { return data.energyUse });
        }
        let max: number = _.max(yData);
        yAxisDtick = max / 5;
        traceData.push({
          x: this.groupMonthlyData.map(data => { return data.date }),
          y: yData,
          name: 'Utility Consumption',
          type: this.displayGraphEnergy,
          yaxis: yaxis,
          offsetgroup: offsetgroup,
          line: energyLine
        });
        yaxis = 'y2';
        offsetgroup = 2;
      }


      if (this.displayGraphCost && this.showCost) {
        let yData: Array<number> = this.groupMonthlyData.map(data => { return data.energyCost });
        let max: number = _.max(yData);
        if (!this.displayGraphEnergy) {
          hoverformat = '$,.0f';
          yAxisTitle = 'Utility Cost';
          yAxisDtick = max / 5;
        } else {
          hoverformat2 = '$,.0f';
          yAxis2Title = 'Utility Cost';
          yAxis2Dtick = max / 5;
        }

        traceData.push({
          x: this.groupMonthlyData.map(data => { return data.date }),
          y: yData,
          name: 'Utility Cost',
          type: this.displayGraphCost,
          yaxis: yaxis,
          offsetgroup: offsetgroup,
          line: costLine
        });
      }

      var layout = {
        legend: {
          orientation: "h"
        },
        title: {
          text: this.meterGroup.name,
          font: {
            size: 18
          },
        },
        xaxis: {
          hoverformat: "%b, %y"
        },
        yaxis: {
          title: {
            text: yAxisTitle,
            font: {
              size: 16
            },
            standoff: 18
          },
          hoverformat: hoverformat,
          // ticksuffix: tickSuffix,
          // tickprefix: tickPrefix,
          automargin: true,
          overlaying: y1overlay,
          dtick: yAxisDtick,
          rangemode: 'tozero',
          tickmode: 'sync'
        },
        yaxis2: {
          title: {
            text: yAxis2Title,
            font: {
              size: 16
            },
            standoff: 18
          },
          hoverformat: hoverformat2,
          automargin: true,
          overlaying: y2overlay,
          side: 'right',
          dtick: yAxis2Dtick,
          rangemode: 'tozero',
          tickmode: 'sync'
        },
        margin: { r: 0, t: 50 },
        hovermode: 'x unified'
      };
      var config = {
        responsive: true,
        modeBarButtonsToRemove: ['lasso2d', 'select2d', 'toggleSpikelines', 'hoverClosestCartesian', 'hoverCompareCartesian'],
        modeBarButtonsToAdd: ['drawline', 'drawopenpath', 'drawcircle', 'drawrect', 'eraseshape'],
        displaylogo: false
      };
      this.plotlyService.newPlot(this.groupMeterDataChart.nativeElement, traceData, layout, config);
    }
  }

  async setFacilityEnergyIsSource(energyIsSource: boolean) {
    if (this.selectedFacility.energyIsSource != energyIsSource) {
      this.selectedFacility.energyIsSource = energyIsSource;
      await this.dbChangesService.updateFacilities(this.selectedFacility);
      this.drawChart();
    }
  }

}
