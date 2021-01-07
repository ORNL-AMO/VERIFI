import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { Subscription } from 'rxjs';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { DashboardService, FacilitySummary } from '../../dashboard.service';

@Component({
  selector: 'app-energy-use-donut',
  templateUrl: './energy-use-donut.component.html',
  styleUrls: ['./energy-use-donut.component.css']
})
export class EnergyUseDonutComponent implements OnInit {


  @ViewChild('energyUseDonut', { static: false }) energyUseDonut: ElementRef;
  facilitiesSummary: Array<FacilitySummary>;
  accountFacilitiesSub: Subscription;
  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService,
    private dashboardService: DashboardService, private plotlyService: PlotlyService) { }

  ngOnInit(): void {
    this.accountFacilitiesSub = this.utilityMeterDataDbService.accountMeterData.subscribe(val => {
      this.facilitiesSummary = this.dashboardService.getAccountFacilitesSummary();
      this.drawChart();
      // this.totalEnergyUsage = _.sumBy(this.facilitiesSummary, 'energyUsage');
      // this.totalMeters = _.sumBy(this.facilitiesSummary, 'numberOfMeters');
      // this.totalEnergyCost = _.sumBy(this.facilitiesSummary, 'energyCost');
    });
  }

  ngOnDestroy() {
    this.accountFacilitiesSub.unsubscribe();
  }


  ngAfterViewInit() {
    this.drawChart();
  }

  drawChart() {
    if (this.energyUseDonut) {
      var data = [{
        values: this.facilitiesSummary.map(summary => { return summary.energyCost }),
        labels: this.facilitiesSummary.map(summary => { return summary.facility.name }),
        textinfo: 'label+percent',
        textposition: 'auto',
        insidetextorientation: "horizontal",
        // textposition: ''
        // hoverinfo: 'label+value',
        hovertemplate: '%{label}: %{value:$,.0f} <extra></extra>',
        hole: .6,
        type: 'pie',
        automargin: true
      }];

      var layout = {
        margin: { "t": 50, "b": 50, "l": 50, "r": 50 },
      };

      let config = {
        responsive: true
      }


      this.plotlyService.newPlot(this.energyUseDonut.nativeElement, data, layout, config);
    }
  }

}
