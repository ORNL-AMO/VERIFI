import { Component, ElementRef, Input, SimpleChanges, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { AccountOverviewData, AccountOverviewFacility, WaterTypeData } from 'src/app/calculations/dashboard-calculations/accountOverviewClass';
import { UtilityColors } from '../../utilityColors';
import * as _ from 'lodash';

@Component({
  selector: 'app-account-water-stacked-bar-chart',
  templateUrl: './account-water-stacked-bar-chart.component.html',
  styleUrls: ['./account-water-stacked-bar-chart.component.css']
})
export class AccountWaterStackedBarChartComponent {
  @Input()
  accountOverviewData: AccountOverviewData;
  @Input()
  waterUnit: string;


  @ViewChild('stackedBarChart', { static: false }) stackedBarChart: ElementRef;
  constructor(
    private plotlyService: PlotlyService) { }

  ngOnInit(): void {
  }

  ngAfterViewInit() {
    this.drawChart();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!changes.dataType && ((changes.accountOverviewData && !changes.accountOverviewData.isFirstChange()))) {
      this.drawChart();
    }
  }

  drawChart() {
    if (this.stackedBarChart) {
      let data = new Array();
      this.accountOverviewData.facilitiesWater = _.orderBy(this.accountOverviewData.facilitiesWater, (fWater: AccountOverviewFacility) => {
        return fWater.totalUsage;
      }, 'desc');
      this.accountOverviewData.waterTypeData.forEach(waterTypeData => {
        data.push({
          x: this.accountOverviewData.facilitiesWater.flatMap(fWater => { return fWater.facility.name }),
          y: this.getYData(waterTypeData, this.accountOverviewData.facilitiesWater),
          name: waterTypeData.waterType,
          type: 'bar',
          marker: {
            color: waterTypeData.color
          }
        })
      });

      var layout = {
        barmode: 'stack',
        showlegend: true,
        yaxis: {
          title: "Water Usage (" + this.waterUnit + ")",
          automargin: true,
        },
        xaxis: {
          automargin: true
        },
        legend: {
          orientation: "h"
        },
        clickmode: "none",
        margin: { t: 10 }
      };
      let config = {
        modeBarButtonsToRemove: ['autoScale2d', 'lasso2d', 'pan2d', 'select2d', 'toggleSpikelines', 'hoverClosestCartesian', 'hoverCompareCartesian', 'autoscale', 'zoom', 'zoomin', 'zoomout'],
        displaylogo: false,
        responsive: true,
      };
      this.plotlyService.newPlot(this.stackedBarChart.nativeElement, data, layout, config);
    }
  }

  getColor(waterType: WaterTypeData): string {
    if (waterType.isIntake) {
      return UtilityColors['Water Intake'].color
    } else {
      return UtilityColors['Water Discharge'].color
    }
  }

  getYData(waterTypeData: WaterTypeData, facilitiesWater: Array<AccountOverviewFacility>): Array<number> {
    let yData: Array<number> = [];
    facilitiesWater.forEach(facility => {
      let facilityData: WaterTypeData = facility.waterTypeData.find(data => {
        return data.waterType == waterTypeData.waterType;
      });
      if (facilityData) {
        yData.push(facilityData.totalConsumption);
      } else {
        yData.push(0);
      }
    });
    return yData;
  }
}
