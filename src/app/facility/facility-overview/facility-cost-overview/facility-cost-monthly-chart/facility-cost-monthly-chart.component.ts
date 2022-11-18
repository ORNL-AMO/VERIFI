import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { Subscription } from 'rxjs';
import { YearMonthData } from 'src/app/models/dashboard';
import { IdbFacility } from 'src/app/models/idb';
import * as _ from 'lodash';
import { FacilityOverviewService } from '../../facility-overview.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { Month, Months } from 'src/app/shared/form-data/months';

@Component({
  selector: 'app-facility-cost-monthly-chart',
  templateUrl: './facility-cost-monthly-chart.component.html',
  styleUrls: ['./facility-cost-monthly-chart.component.css']
})
export class FacilityCostMonthlyChartComponent implements OnInit {

  @ViewChild('monthlyCostChart', { static: false }) monthlyCostChart: ElementRef;
  yearMonthData: Array<YearMonthData>;
  yearMonthDataSub: Subscription;
  constructor(private plotlyService: PlotlyService, private facilityOverviewService: FacilityOverviewService,
    private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.yearMonthDataSub = this.facilityOverviewService.costsYearMonthData.subscribe(val => {
      this.yearMonthData = val;
      this.drawChart();
    })
  }

  ngOnDestroy() {
    this.yearMonthDataSub.unsubscribe();
  }

  ngAfterViewInit() {
    this.drawChart();
  }

  drawChart() {
    if (this.monthlyCostChart && this.yearMonthData) {
      let traceData = Array();

      let yaxisTitle: string = "Utility Costs";
      let tickprefix: string = "";
      let hoverformat: string = ",.2f";
      let hovertemplate: string = '%{text} (%{x}): %{y:$,.0f} <extra></extra>'

      let years: Array<number> = this.yearMonthData.flatMap(data => { return data.yearMonth.fiscalYear });
      years = _.uniq(years);
      let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
      let months: Array<Month> = Months.map(month => { return month });
      if (selectedFacility.fiscalYear == 'nonCalendarYear') {
        let monthStartIndex: number = months.findIndex(month => { return month.monthNumValue == selectedFacility.fiscalYearMonth });
        let fromStartMonth: Array<Month> = months.splice(monthStartIndex);
        months = fromStartMonth.concat(months);
      }

      years.forEach(year => {
        let x: Array<string> = new Array();
        let y: Array<number> = new Array();
        months.forEach(month => {
          let energyUse: number = this.yearMonthData.find(ymData => { return ymData.yearMonth.fiscalYear == year && ymData.yearMonth.month === month.abbreviation })?.energyCost;
          x.push(month.abbreviation);
          y.push(energyUse);
        });
        let name: string = year.toString();
        if (selectedFacility.fiscalYear == 'nonCalendarYear') {
          name = 'FY - ' + year
        }
        let trace = {
          type: 'scatter',
          x: x,
          y: y,
          name: name,
          text: x.map(item => {
            if (selectedFacility.fiscalYear == 'nonCalendarYear') {
              return 'FY - ' + year
            } else {
              return year
            }
          }),
          hovertemplate: hovertemplate
        }
        traceData.push(trace);

      })


      var layout = {
        title: {
          text: yaxisTitle,
          font: {
            size: 24
          },
        },
        xaxis: {
          autotick: false,
        },
        yaxis: {
          title: {
            tickprefix: tickprefix
          },
          hoverformat: hoverformat
        },
        legend: {
          orientation: 'h'
        }
      };

      let config = {
        modeBarButtonsToRemove: ['autoScale2d', 'lasso2d', 'pan2d', 'select2d', 'toggleSpikelines', 'hoverClosestCartesian', 'hoverCompareCartesian'],
        displaylogo: false,
        responsive: true,
      };
      this.plotlyService.newPlot(this.monthlyCostChart.nativeElement, traceData, layout, config);
    }
  }


}
