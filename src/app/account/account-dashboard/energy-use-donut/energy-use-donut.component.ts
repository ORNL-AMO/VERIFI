import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { Subscription } from 'rxjs';
import { DashboardService } from 'src/app/dashboard/dashboard.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { AccountFacilitiesSummary } from 'src/app/models/dashboard';
import { IdbAccount } from 'src/app/models/idb';
import { MeterSummaryService } from 'src/app/shared/helper-services/meter-summary.service';

@Component({
  selector: 'app-energy-use-donut',
  templateUrl: './energy-use-donut.component.html',
  styleUrls: ['./energy-use-donut.component.css']
})
export class EnergyUseDonutComponent implements OnInit {


  @ViewChild('energyUseDonut', { static: false }) energyUseDonut: ElementRef;
  facilitiesSummary: AccountFacilitiesSummary;
  accountFacilitiesSub: Subscription;

  graphDisplay: "cost" | "usage" | "emissions";
  graphDisplaySub: Subscription;


  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService,
    private dashboardService: DashboardService, private plotlyService: PlotlyService,
    private accountDbService: AccountdbService, private meterSummaryService: MeterSummaryService) { }

  ngOnInit(): void {
    this.accountFacilitiesSub = this.utilityMeterDataDbService.accountMeterData.subscribe(val => {
      this.facilitiesSummary = this.meterSummaryService.getAccountFacilitesSummary();
      this.drawChart();
    });

    this.graphDisplaySub = this.dashboardService.graphDisplay.subscribe(val => {
      this.graphDisplay = val;
      this.drawChart();
    })
  }

  ngOnDestroy() {
    this.accountFacilitiesSub.unsubscribe();
    this.graphDisplaySub.unsubscribe();
  }


  ngAfterViewInit() {
    this.drawChart();
  }

  drawChart() {
    if (this.energyUseDonut && this.facilitiesSummary && this.facilitiesSummary.facilitySummaries.length != 0 && this.graphDisplay) {
      let yDataProperty: string = "energyCost";
      let hovertemplate: string = '%{label}: %{value:$,.0f} <extra></extra>';
      if (this.graphDisplay == "usage") {
        let selectedAccout: IdbAccount = this.accountDbService.selectedAccount.getValue();
        yDataProperty = "energyUsage";
        hovertemplate = '%{label}: %{value:,.0f} ' + selectedAccout.energyUnit + ' <extra></extra>'
      } else if (this.graphDisplay == "emissions") {
        yDataProperty = "emissions";
        hovertemplate = '%{label}: %{value:,.0f} kg CO<sub>2</sub> <extra></extra>'
      }

      var data = [{
        values: this.facilitiesSummary.facilitySummaries.map(summary => { return summary[yDataProperty] }),
        labels: this.facilitiesSummary.facilitySummaries.map(summary => { return summary.facility.name }),
        marker: {
          colors: this.facilitiesSummary.facilitySummaries.map(summary => { return summary.facility.color }),
        },
        textinfo: 'label+percent',
        textposition: 'auto',
        insidetextorientation: "horizontal",
        // textposition: ''
        // hoverinfo: 'label+value',
        hovertemplate: hovertemplate,
        hole: .6,
        type: 'pie',
        automargin: true
      }];

      var layout = {
        margin: { "t": 50, "b": 50, "l": 50, "r": 50 },
      };

      let config = {
        displaylogo: false,
        responsive: true
      }
      this.plotlyService.newPlot(this.energyUseDonut.nativeElement, data, layout, config);
    }
  }

}
