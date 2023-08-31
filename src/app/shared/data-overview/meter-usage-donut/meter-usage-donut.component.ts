import { Component, ElementRef, ViewChild, Input, SimpleChanges } from '@angular/core';
import { UtilityColors } from '../../utilityColors';
import * as _ from 'lodash';
import { Subscription } from 'rxjs';
import { PlotlyService } from 'angular-plotly.js';
import { FacilityOverviewService } from 'src/app/facility/facility-overview/facility-overview.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility, IdbUtilityMeter } from 'src/app/models/idb';
import { FacilityOverviewMeter } from 'src/app/calculations/dashboard-calculations/facilityOverviewClass';

@Component({
  selector: 'app-meter-usage-donut',
  templateUrl: './meter-usage-donut.component.html',
  styleUrls: ['./meter-usage-donut.component.css']
})
export class MeterUsageDonutComponent {
  @Input()
  dataType: 'energyUse' | 'emissions' | 'cost' | 'water';
  @Input()
  facilityId: string;
  @Input()
  facilityOverviewMeters: Array<FacilityOverviewMeter>;
  @Input()
  inHomeScreen: boolean;
  @Input()
  emissionsDisplay: 'market' | 'location';

  @ViewChild('energyUseDonut', { static: false }) energyUseDonut: ElementRef;
  selectedFacility: IdbFacility;
  // emissionsDisplay: 'market' | 'location';
  // emissionsDisplaySub: Subscription;

  constructor(private plotlyService: PlotlyService, private facilityOverviewService: FacilityOverviewService,
    private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    this.selectedFacility = facilities.find(facility => { return facility.guid == this.facilityId });


    // if (this.dataType == 'emissions') {
    //   this.emissionsDisplaySub = this.facilityOverviewService.emissionsDisplay.subscribe(val => {
    //     this.emissionsDisplay = val;
    //     this.drawChart();
    //   });
    // } else {
    // this.drawChart();
    // }
  }

  // ngOnDestroy() {
  //   if (this.emissionsDisplaySub) {
  //     this.emissionsDisplaySub.unsubscribe();
  //   }
  // }

  ngAfterViewInit() {
    this.drawChart();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!changes.dataType && (changes.facilityOverviewMeters && !changes.facilityOverviewMeters.isFirstChange())) {
      this.drawChart();
    }
  }

  drawChart() {
    if (this.energyUseDonut && this.facilityOverviewMeters) {
      this.facilityOverviewMeters = _.orderBy(this.facilityOverviewMeters, (meterOverview) => { return meterOverview.meter.source });

      var data = [{
        values: this.getValues(),
        labels: this.facilityOverviewMeters.map(meterOverview => { return meterOverview.meter.name }),
        marker: {
          colors: this.facilityOverviewMeters.map(meterOverview => { return this.getTraceColor(meterOverview.meter) }),
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
        automargin: true,
        sort: false
      }];

      let height: number;
      if (this.inHomeScreen) {
        height = 350;
      }

      var layout = {
        height: height,
        margin: { "t": 50, "b": 50, "l": 50, "r": 50 },
        showlegend: false,
        annotations: this.getAnnotations(),
        xaxis: {
          showgrid: false,
          zeroline: false,
          showline: false,
          showticklabels: false
        },
        yaxis: {
          showgrid: false,
          zeroline: false,
          showline: false,
          showticklabels: false
        }
      };

      let config = {
        displaylogo: false,
        responsive: true
      }
      this.plotlyService.newPlot(this.energyUseDonut.nativeElement, data, layout, config);
    }
  }

  getHoverTemplate(): string {
    if (this.dataType == 'energyUse') {
      return '%{label}: %{value:,.0f} ' + this.selectedFacility.energyUnit + ' <extra></extra>';
    } else if (this.dataType == 'cost') {
      return '%{label}: %{value:$,.0f} <extra></extra>';
    } else if (this.dataType == 'emissions') {
      return '%{label}: %{value:,.0f} tonne CO<sub>2</sub>e <extra></extra>';
    } else if (this.dataType == 'water') {
      return '%{label}: %{value:,.0f} ' + this.selectedFacility.volumeLiquidUnit + ' <extra></extra>';
    }
  }

  getValues(): Array<number> {
    if (this.dataType == 'energyUse' || this.dataType == 'water') {
      return this.facilityOverviewMeters.map(meterOverview => { return meterOverview.totalUsage });
    } else if (this.dataType == 'cost') {
      return this.facilityOverviewMeters.map(meterOverview => { return meterOverview.totalCost });
    } else if (this.dataType == 'emissions') {
      if (this.emissionsDisplay == 'location') {
        return this.facilityOverviewMeters.map(meterOverview => { return meterOverview.totalLocationEmissions });
      } else {
        return this.facilityOverviewMeters.map(meterOverview => { return meterOverview.totalMarketEmissions });
      }
    }
  }

  getTraceColor(meter: IdbUtilityMeter): string {
    if (this.dataType != 'emissions') {
      return UtilityColors[meter.source].color
    } else {
      if (this.emissionsDisplay == 'market') {
        if (meter.scope == 1 || meter.scope == 2) {
          //Scope 1
          return '#95A5A6';
        } else if (meter.scope == 3 || meter.scope == 4) {
          //Scope 2
          return '#273746';
        }
      } else {
        if (meter.scope == 1 || meter.scope == 2) {
          //Scope 1
          return '#873600';
        } else if (meter.scope == 3 || meter.scope == 4) {
          //Scope 2
          return '#B9770E';
        }
      }
    }
  }

  getAnnotations(): Array<any> {
    if (this.dataType == 'emissions') {
      if (this.emissionsDisplay == 'market') {
        return [
          {
            x: 0.0,
            y: 0.0,
            xref: 'x',
            yref: 'y',
            text: 'Market',
            showarrow: false,
            font: {
              size: 22
            },
          }
        ];
      } else {
        return [
          {
            x: 0.0,
            y: 0.0,
            xref: 'x',
            yref: 'y',
            text: 'Location',
            showarrow: false,
            font: {
              size: 22,
            },
          }
        ];
      }
    }
  }
}
