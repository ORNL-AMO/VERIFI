import { Component, ElementRef, ViewChild, Input, SimpleChanges } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { Subscription } from 'rxjs';
import { AccountOverviewService } from 'src/app/account/account-overview/account-overview.service';
import { AccountOverviewFacility } from 'src/app/calculations/dashboard-calculations/accountOverviewClass';

@Component({
  selector: 'app-facility-usage-donut',
  templateUrl: './facility-usage-donut.component.html',
  styleUrls: ['./facility-usage-donut.component.css'],
  standalone: false
})
export class FacilityUsageDonutComponent {
  @Input()
  dataType: 'energyUse' | 'emissions' | 'cost' | 'water';
  @Input()
  energyUnit: string;
  @Input()
  waterUnit: string;
  @Input()
  accountOverviewFacilities: Array<AccountOverviewFacility>;
  @Input()
  inHomeScreen: boolean;
  isVisible: boolean = true;
  titleText: string;

  @ViewChild('usageDonut', { static: false }) usageDonut: ElementRef;

  emissionsDisplaySub: Subscription;
  emissionsDisplay: "market" | "location";
  constructor(private plotlyService: PlotlyService, private accountOverviewService: AccountOverviewService) { }

  ngOnInit(): void {

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
    if (this.emissionsDisplaySub) {
      this.emissionsDisplaySub.unsubscribe();
    }
  }

  ngAfterViewInit() {
    this.drawChart();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!changes.dataType || (changes.accountOverviewFacilities && !changes.accountOverviewFacilities.isFirstChange())) {
      this.drawChart();
    }
  }

  drawChart() {
    let hasNoValue = this.getValues().every(value => value == 0)
    if (this.usageDonut && this.accountOverviewFacilities) {
      let values = [null, ...this.getValues()];
      let labels = ['rootLabel', ...this.accountOverviewFacilities.map(summary => { return summary.facility.name })];
      let parents = ['', ...this.accountOverviewFacilities.map(() => '')];
      let colors = [null, ...this.accountOverviewFacilities.map(summary => { return summary.facility.color })];
      let data = [];

      if (hasNoValue) {
        this.isVisible = false;
      }
      else {
        this.isVisible = true;
        data = [{
          type: "treemap",
          values: values,
          labels: labels,
          parents: parents,
          texttemplate: '%{label}<br>%{percentParent:.1%}',
          hovertemplate: this.getHoverTemplate(labels),
          textposition: 'auto',
          insidetextorientation: "horizontal",
          automargin: true,
          marker: {
            colors: colors,
            line: {
              color: '#fff',
              width: 0
            }
          }
        }];
      }
      let height: number;
      if (this.inHomeScreen) {
        height = 350;
      }

      var layout = {
        height: height,
        title: {
          text: this.titleText,
          font: {
            size: 14,
            family: 'Arial'
          }
        },
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

  getHoverTemplate(labels: any): string {
    if (this.dataType == 'energyUse') {
      this.titleText = '<b>Company Energy Use Breakdown</b>';
      return labels.map(label => label == 'rootLabel' ? '' : ('%{label}: %{value:,.0f} ' + this.energyUnit + ' <extra></extra>'));
    } else if (this.dataType == 'cost') {
      this.titleText = '<b>Company Utility Cost Breakdown</b>';
      return labels.map(label => label == 'rootLabel' ? '' : ('%{label}: %{value:$,.0f} <extra></extra>'));
    } else if (this.dataType == 'water') {
      this.titleText = '<b>Company Water Flow Breakdown</b>';
      return labels.map(label => label == 'rootLabel' ? '' : ('%{label}: %{value:,.0f} ' + this.waterUnit + ' <extra></extra>'));
    } else if (this.dataType == 'emissions') {
      this.titleText = '<b>Company Emissions Breakdown</b>';
      return labels.map(label => label == 'rootLabel' ? '' : ('%{label}: %{value:,.0f} tonne CO<sub>2</sub>e <extra></extra>'));
    }
  }

  getValues(): Array<number> {
    if (this.dataType == 'energyUse') {
      return this.accountOverviewFacilities.map(summary => { return summary.totalUsage });
    } else if (this.dataType == 'cost') {
      return this.accountOverviewFacilities.map(summary => { return summary.totalCost });
    } else if (this.dataType == 'water') {
      return this.accountOverviewFacilities.map(summary => { return summary.totalUsage });
    } else if (this.dataType == 'emissions') {
      if (this.emissionsDisplay == 'location') {
        return this.accountOverviewFacilities.map(summary => { return summary.emissions.totalWithLocationEmissions });
      } else {
        return this.accountOverviewFacilities.map(summary => {
          if (summary.emissions.totalWithMarketEmissions > 0) {
            return summary.emissions.totalWithMarketEmissions;
          } else {
            return 0
          }
        });
      }
    }

  }
}
