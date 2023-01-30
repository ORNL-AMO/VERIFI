import { Component, ElementRef, ViewChild, Input } from '@angular/core';
import { FacilityMeterSummaryData } from 'src/app/models/dashboard';
import { UtilityColors } from '../../utilityColors';
import * as _ from 'lodash';
import { Subscription } from 'rxjs';
import { PlotlyService } from 'angular-plotly.js';
import { FacilityOverviewService } from 'src/app/facility/facility-overview/facility-overview.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility } from 'src/app/models/idb';

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

  @ViewChild('energyUseDonut', { static: false }) energyUseDonut: ElementRef;
  metersSummary: FacilityMeterSummaryData;
  metersSummarySub: Subscription;
  selectedFacility: IdbFacility;
  emissionsDisplay: 'market' | 'location';
  emissionsDisplaySub: Subscription;

  constructor(private plotlyService: PlotlyService, private facilityOverviewService: FacilityOverviewService,
    private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    this.selectedFacility = facilities.find(facility => { return facility.guid == this.facilityId });

    if (this.dataType == 'energyUse' || this.dataType == 'emissions') {
      this.metersSummarySub = this.facilityOverviewService.energyMeterSummaryData.subscribe(sourceData => {
        this.metersSummary = sourceData;
        if (this.dataType == 'energyUse') {
          this.drawChart();
        } else if (this.dataType == 'emissions' && this.emissionsDisplay) {
          this.drawChart();
        }
      });
    } else if (this.dataType == 'cost') {
      this.metersSummarySub = this.facilityOverviewService.costsMeterSummaryData.subscribe(sourceData => {
        this.metersSummary = sourceData;
        this.drawChart();
      });
    } else if (this.dataType == 'water') {
      this.metersSummarySub = this.facilityOverviewService.waterMeterSummaryData.subscribe(sourceData => {
        this.metersSummary = sourceData;
        this.drawChart();
      });
    }
    if (this.dataType == 'emissions') {
      this.emissionsDisplaySub = this.facilityOverviewService.emissionsDisplay.subscribe(val => {
        this.emissionsDisplay = val;
        this.drawChart();
      });
    }
  }

  ngOnDestroy() {
    this.metersSummarySub.unsubscribe();
    if(this.emissionsDisplaySub){
      this.emissionsDisplaySub.unsubscribe();
    }
  }

  ngAfterViewInit() {
    this.drawChart();
  }

  drawChart() {
    if (this.energyUseDonut && this.metersSummary) {

      this.metersSummary.meterSummaries = _.orderBy(this.metersSummary.meterSummaries, (summary) => { return summary.meter.source });

      var data = [{
        values: this.getValues(),
        labels: this.metersSummary.meterSummaries.map(summary => { return summary.meter.name }),
        marker: {
          colors: this.metersSummary.meterSummaries.map(summary => { return UtilityColors[summary.meter.source].color }),
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
    if (this.dataType == 'energyUse') {
      return this.metersSummary.meterSummaries.map(summary => { return summary.energyUsage });
    } else if (this.dataType == 'cost') {
      return this.metersSummary.meterSummaries.map(summary => { return summary.energyCost });
    } else if (this.dataType == 'emissions') {
      if (this.emissionsDisplay == 'location') {
        return this.metersSummary.meterSummaries.map(summary => { return summary.locationEmissions });
      } else {
        return this.metersSummary.meterSummaries.map(summary => { return summary.marketEmissions });
      }
    } else if (this.dataType == 'water') {
      return this.metersSummary.meterSummaries.map(summary => { return summary.consumption });
    }
  }
}
