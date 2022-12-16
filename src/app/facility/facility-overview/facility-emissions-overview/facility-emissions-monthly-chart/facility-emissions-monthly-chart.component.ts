import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { Subscription } from 'rxjs';
import { YearMonthData } from 'src/app/models/dashboard';
import * as _ from 'lodash';
import { FacilityOverviewService } from '../../facility-overview.service';
import { Month, Months } from 'src/app/shared/form-data/months';
import { IdbFacility } from 'src/app/models/idb';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';

@Component({
  selector: 'app-facility-emissions-monthly-chart',
  templateUrl: './facility-emissions-monthly-chart.component.html',
  styleUrls: ['./facility-emissions-monthly-chart.component.css']
})
export class FacilityEmissionsMonthlyChartComponent implements OnInit {

  @ViewChild('monthlyEmissionsChart', { static: false }) monthlyEmissionsChart: ElementRef;
  yearMonthData: Array<YearMonthData>;
  yearMonthDataSub: Subscription;
  emissionsDisplay: 'market' | 'location';
  emissionsDisplaySub: Subscription;
  constructor(private plotlyService: PlotlyService, private facilityOverviewService: FacilityOverviewService,
    private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.emissionsDisplaySub = this.facilityOverviewService.emissionsDisplay.subscribe(val => {
      this.emissionsDisplay = val;
      this.drawChart();
    });
    this.yearMonthDataSub = this.facilityOverviewService.energyYearMonthData.subscribe(val => {
      this.yearMonthData = val;
      this.drawChart();
    })
  }

  ngOnDestroy() {
    this.yearMonthDataSub.unsubscribe();
    this.emissionsDisplaySub.unsubscribe();
  }

  ngAfterViewInit() {
    this.drawChart();
  }

  drawChart() {
    if (this.monthlyEmissionsChart && this.yearMonthData && this.emissionsDisplay) {
      let traceData = Array();

      let yaxisTitle: string = "Utility Emissions (kg CO<sub>2</sub>e)";
      let tickprefix: string = "";
      let hoverformat: string = ",.2f";
      let hovertemplate: string = '%{text} (%{x}): %{y:,.0f} kg CO<sub>2</sub>e <extra></extra>'

      let years: Array<number> = this.yearMonthData.flatMap(data => { return data.yearMonth.fiscalYear });
      years = _.uniq(years);
      let months: Array<Month> = Months.map(month => { return month });
      let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
      if (selectedFacility.fiscalYear == 'nonCalendarYear') {
        let monthStartIndex: number = months.findIndex(month => { return month.monthNumValue == selectedFacility.fiscalYearMonth });
        let fromStartMonth: Array<Month> = months.splice(monthStartIndex);
        months = fromStartMonth.concat(months);
      }
      years.forEach(year => {
        let x: Array<string> = new Array();
        let y: Array<number> = new Array();
        months.forEach(month => {
          let emissions: number;
          let ymData: YearMonthData = this.yearMonthData.find(ymData => { return ymData.yearMonth.fiscalYear == year && ymData.yearMonth.month === month.abbreviation });
          if (ymData) {
            if (this.emissionsDisplay == 'location') {
              emissions = ymData.locationEmissions;
            } else {
              emissions = ymData.marketEmissions;
            }
          }
          x.push(month.abbreviation);
          y.push(emissions)
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
          hovertemplate: hovertemplate,
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
      this.plotlyService.newPlot(this.monthlyEmissionsChart.nativeElement, traceData, layout, config);
    }
  }

}
