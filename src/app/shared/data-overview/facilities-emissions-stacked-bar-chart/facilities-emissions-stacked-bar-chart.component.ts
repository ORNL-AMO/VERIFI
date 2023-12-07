import { Component, ElementRef, ViewChild, Input, SimpleChanges } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { Subscription } from 'rxjs';
import { AccountOverviewService } from 'src/app/account/account-overview/account-overview.service';
import { UtilityColors } from '../../utilityColors';
import * as _ from 'lodash';
import { AccountOverviewFacility } from 'src/app/calculations/dashboard-calculations/accountOverviewClass';
import { EmissionsTypes, getEmissionsTypeColor, getEmissionsTypes } from 'src/app/models/eGridEmissions';

@Component({
  selector: 'app-facilities-emissions-stacked-bar-chart',
  templateUrl: './facilities-emissions-stacked-bar-chart.component.html',
  styleUrls: ['./facilities-emissions-stacked-bar-chart.component.css']
})
export class FacilitiesEmissionsStackedBarChartComponent {
  @Input()
  accountOverviewFacilities: Array<AccountOverviewFacility>;


  @ViewChild('stackedBarChart', { static: false }) stackedBarChart: ElementRef;
  emissionsDisplay: "market" | "location";
  emissionsDisplaySub: Subscription;
  constructor(private accountOverviewService: AccountOverviewService,
    private plotlyService: PlotlyService) { }

  ngOnInit(): void {
    this.emissionsDisplaySub = this.accountOverviewService.emissionsDisplay.subscribe(val => {
      this.emissionsDisplay = val;
      this.drawChart();
    });
  }

  ngAfterViewInit() {
    this.drawChart();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!changes.dataType && (changes.accountOverviewFacilities && !changes.accountOverviewFacilities.isFirstChange())) {
      this.drawChart();
    }
  }

  ngOnDestroy() {
    this.emissionsDisplaySub.unsubscribe();
  }

  drawChart() {
    if (this.stackedBarChart && this.accountOverviewFacilities) {
      let data = this.getEmissionsData();
      var layout = {
        barmode: 'stack',
        showlegend: true,
        yaxis: {
          title: "Emissions (tonne CO<sub>2</sub>)",
          automargin: true,
          tickprefix: ""
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


  getEmissionsData(): Array<any> {
    let data = new Array();



    if (this.accountOverviewFacilities.findIndex(overviewFacility => { return overviewFacility.emissions.fugitiveEmissions != 0 }) != 1) {
      let yValues: Array<number> = this.accountOverviewFacilities.map(overviewFacility => { return overviewFacility.emissions.fugitiveEmissions });
      data.push({
        x: this.accountOverviewFacilities.map(overviewFacility => { return overviewFacility.facility.name }),
        y: yValues,
        name: 'Fugitive',
        type: 'bar',
        marker: {
          color: getEmissionsTypeColor('Scope 1: Fugitive')
        }
      });
    }
    if (this.emissionsDisplay == 'location' && this.accountOverviewFacilities.findIndex(overviewFacility => { return overviewFacility.emissions.locationElectricityEmissions != 0 }) != 1) {
      let yValues: Array<number> = this.accountOverviewFacilities.map(overviewFacility => { return overviewFacility.emissions.locationElectricityEmissions });
      data.push({
        x: this.accountOverviewFacilities.map(overviewFacility => { return overviewFacility.facility.name }),
        y: yValues,
        name: 'Location',
        type: 'bar',
        marker: {
          color: getEmissionsTypeColor('Scope 2: Electricity (Location)')
        }
      });
    }
    if (this.emissionsDisplay == 'market' && this.accountOverviewFacilities.findIndex(overviewFacility => { return overviewFacility.emissions.marketElectricityEmissions != 0 }) != 1) {
      let yValues: Array<number> = this.accountOverviewFacilities.map(overviewFacility => { return overviewFacility.emissions.marketElectricityEmissions });
      data.push({
        x: this.accountOverviewFacilities.map(overviewFacility => { return overviewFacility.facility.name }),
        y: yValues,
        name: 'Market',
        type: 'bar',
        marker: {
          color: getEmissionsTypeColor('Scope 2: Electricity (Market)')
        }
      });
    }
    if (this.accountOverviewFacilities.findIndex(overviewFacility => { return overviewFacility.emissions.mobileTotalEmissions != 0 }) != 1) {
      let yValues: Array<number> = this.accountOverviewFacilities.map(overviewFacility => { return overviewFacility.emissions.mobileTotalEmissions });
      data.push({
        x: this.accountOverviewFacilities.map(overviewFacility => { return overviewFacility.facility.name }),
        y: yValues,
        name: 'Mobile',
        type: 'bar',
        marker: {
          color: getEmissionsTypeColor('Scope 1: Mobile')
        }
      });
    }

    if (this.accountOverviewFacilities.findIndex(overviewFacility => { return overviewFacility.emissions.processEmissions != 0 }) != 1) {
      let yValues: Array<number> = this.accountOverviewFacilities.map(overviewFacility => { return overviewFacility.emissions.processEmissions });
      data.push({
        x: this.accountOverviewFacilities.map(overviewFacility => { return overviewFacility.facility.name }),
        y: yValues,
        name: 'Process',
        type: 'bar',
        marker: {
          color: getEmissionsTypeColor('Scope 1: Process')
        }
      });
    }
    //TODO: Scope 1 stationary
    //TODO: Scope 2 other

    data = _.orderBy(data, (d) => { return _.sum(d.y) }, 'desc');
    return data;
  }
}
