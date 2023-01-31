import { Component, ElementRef, ViewChild, Input, SimpleChanges } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { Subscription } from 'rxjs';
import { AccountOverviewService } from 'src/app/account/account-overview/account-overview.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountFacilitiesSummary } from 'src/app/models/dashboard';
import { IdbAccount } from 'src/app/models/idb';

@Component({
  selector: 'app-facility-usage-donut',
  templateUrl: './facility-usage-donut.component.html',
  styleUrls: ['./facility-usage-donut.component.css']
})
export class FacilityUsageDonutComponent {
  @Input()
  dataType: 'energyUse' | 'emissions' | 'cost' | 'water';
  @Input()
  accountFacilitiesSummary: AccountFacilitiesSummary;
  @Input()
  energyUnit: string;
  @Input()
  waterUnit: string;

  @ViewChild('usageDonut', { static: false }) usageDonut: ElementRef;
  // accountFacilitiesSummarySub: Subscription;

  emissionsDisplaySub: Subscription;
  emissionsDisplay: "market" | "location";
  constructor(private plotlyService: PlotlyService, private accountOverviewService: AccountOverviewService,
    private accountDbService: AccountdbService) { }

  ngOnInit(): void {
    // if (this.dataType == 'energyUse' || this.dataType == 'emissions') {
    //   this.accountFacilitiesSummarySub = this.accountOverviewService.accountFacilitiesEnergySummary.subscribe(accountFacilitiesSummary => {
    //     this.facilitiesSummary = accountFacilitiesSummary;
    //     if (this.dataType == 'energyUse') {
    //       this.drawChart();
    //     } else if (this.dataType == 'emissions' && this.emissionsDisplay) {
    //       this.drawChart();
    //     }
    //   });
    // } else if (this.dataType == 'cost') {
    //   this.accountFacilitiesSummarySub = this.accountOverviewService.accountFacilitiesCostsSummary.subscribe(accountFacilitiesSummary => {
    //     this.facilitiesSummary = accountFacilitiesSummary;
    //     this.drawChart();
    //   });
    // } else if (this.dataType == 'water') {
    //   this.accountFacilitiesSummarySub = this.accountOverviewService.accountFacilitiesWaterSummary.subscribe(accountFacilitiesSummary => {
    //     this.facilitiesSummary = accountFacilitiesSummary;
    //     this.drawChart();
    //   });
    // }

    if (this.dataType == 'emissions') {
      this.emissionsDisplaySub = this.accountOverviewService.emissionsDisplay.subscribe(val => {
        this.emissionsDisplay = val;
        if (this.emissionsDisplay) {
          this.drawChart();
        }
      })
    }
  }

  ngOnDestroy() {
    // this.accountFacilitiesSummarySub.unsubscribe();
    if (this.emissionsDisplaySub) {
      this.emissionsDisplaySub.unsubscribe();
    }
  }

  ngAfterViewInit() {
    this.drawChart();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!changes.dataType && !changes.accountFacilitiesSummary.isFirstChange()) {
      this.drawChart();
    }
  }

  drawChart() {
    if (this.usageDonut && this.accountFacilitiesSummary) {
      var data = [{
        values: this.getValues(),
        labels: this.accountFacilitiesSummary.facilitySummaries.map(summary => { return summary.facility.name }),
        marker: {
          colors: this.accountFacilitiesSummary.facilitySummaries.map(summary => { return summary.facility.color }),
          line: {
            color: '#fff',
            width: 5
          }
        },
        texttemplate: '%{label}: (%{percent:.1%})',
        textposition: 'auto',
        insidetextorientation: "horizontal",
        hovertemplate: this.getHoverTemplate(),
        hole: .5,
        type: 'pie',
        automargin: true
      }];

      var layout = {
        margin: { "t": 50, "b": 50, "l": 50, "r": 50 },
        showlegend: false
      };

      let config = {
        displaylogo: false,
        responsive: true
      }
      this.plotlyService.newPlot(this.usageDonut.nativeElement, data, layout, config);
    }
  }

  getHoverTemplate(): string {
    if (this.dataType == 'energyUse') {
      return '%{label}: %{value:,.0f} ' + this.energyUnit + ' <extra></extra>';
    } else if (this.dataType == 'cost') {
      return '%{label}: %{value:$,.0f} <extra></extra>';
    } else if (this.dataType == 'water') {
      return '%{label}: %{value:,.0f} ' + this.waterUnit + ' <extra></extra>'
    } else if (this.dataType == 'emissions') {
      return '%{label}: %{value:,.0f} tonne CO<sub>2</sub>e <extra></extra>'
    }
  }

  getValues(): Array<number> {
    if (this.dataType == 'energyUse') {
      return this.accountFacilitiesSummary.facilitySummaries.map(summary => { return summary.energyUsage });
    } else if (this.dataType == 'cost') {
      return this.accountFacilitiesSummary.facilitySummaries.map(summary => { return summary.energyCost });
    } else if (this.dataType == 'water') {
      return this.accountFacilitiesSummary.facilitySummaries.map(summary => { return summary.consumption });
    } else if (this.dataType == 'emissions') {
      if (this.emissionsDisplay == 'location') {
        return this.accountFacilitiesSummary.facilitySummaries.map(summary => { return summary.locationEmissions / 1000 });
      } else {
        return this.accountFacilitiesSummary.facilitySummaries.map(summary => { return summary.marketEmissions / 1000 });
      }
    }

  }
}
