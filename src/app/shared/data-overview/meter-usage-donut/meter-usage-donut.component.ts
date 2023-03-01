import { Component, ElementRef, ViewChild, Input, SimpleChanges } from '@angular/core';
import { UtilityColors } from '../../utilityColors';
import * as _ from 'lodash';
import { Subscription } from 'rxjs';
import { PlotlyService } from 'angular-plotly.js';
import { FacilityOverviewService } from 'src/app/facility/facility-overview/facility-overview.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility } from 'src/app/models/idb';
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

  @ViewChild('energyUseDonut', { static: false }) energyUseDonut: ElementRef;
  selectedFacility: IdbFacility;
  emissionsDisplay: 'market' | 'location';
  emissionsDisplaySub: Subscription;

  constructor(private plotlyService: PlotlyService, private facilityOverviewService: FacilityOverviewService,
    private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    this.selectedFacility = facilities.find(facility => { return facility.guid == this.facilityId });


    if (this.dataType == 'emissions') {
      this.emissionsDisplaySub = this.facilityOverviewService.emissionsDisplay.subscribe(val => {
        this.emissionsDisplay = val;
        this.drawChart();
      });
    } else {
      this.drawChart();
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
    if (!changes.dataType && !changes.facilityOverviewMeters.isFirstChange()) {
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
          colors: this.facilityOverviewMeters.map(meterOverview => { return UtilityColors[meterOverview.meter.source].color }),
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

      var layout = {
        margin: { "t": 50, "b": 50, "l": 50, "r": 50 },
        showlegend: false
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
      return '%{label}: %{value:,.0f} kg CO<sub>2</sub>e <extra></extra>';
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
}
