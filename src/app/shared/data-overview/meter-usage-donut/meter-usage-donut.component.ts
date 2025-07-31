import { Component, ElementRef, ViewChild, Input, SimpleChanges } from '@angular/core';
import { UtilityColors } from '../../utilityColors';
import * as _ from 'lodash';
import { Subscription } from 'rxjs';
import { PlotlyService } from 'angular-plotly.js';
import { FacilityOverviewService } from 'src/app/data-evaluation/facility/facility-overview/facility-overview.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityOverviewMeter } from 'src/app/calculations/dashboard-calculations/facilityOverviewClass';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
  selector: 'app-meter-usage-donut',
  templateUrl: './meter-usage-donut.component.html',
  styleUrls: ['./meter-usage-donut.component.css'],
  standalone: false
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
  isVisible: boolean = true;
  energyUnit: string;
  titleText: string;

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
    if (!changes.dataType && (changes.facilityOverviewMeters && !changes.facilityOverviewMeters.isFirstChange())) {
      this.drawChart();
    }
  }

  drawChart() {
    if (this.energyUseDonut && this.facilityOverviewMeters) {
      this.facilityOverviewMeters = _.orderBy(this.facilityOverviewMeters, (meterOverview) => { return meterOverview.meter.source });
      this.facilityOverviewMeters.reverse();
      let values = this.getValues();
      let hasNoValue = this.getValues().every(value => value == 0)
      let labels = this.facilityOverviewMeters.map(meterOverview => { return meterOverview.meter.name });
      let colors = this.facilityOverviewMeters.map(meterOverview => { return UtilityColors[meterOverview.meter.source].color });
      let total = values.reduce((sum, val) => sum + val, 0);
      let labelText = labels.map((label, i) => {
        let percentage = ((values[i] / total) * 100).toFixed(1);
        let text = label + " (" + percentage + "%) ";
        return text;
      });

      if (hasNoValue) {
        this.isVisible = false;
      }
      else {
        this.isVisible = true;
        var data = [{
          type: 'bar',
          orientation: 'h',
          x: values,
          y: labelText,
          marker: {
            color: colors
          },
          texttemplate: this.getHoverTemplate(),
          textposition: 'auto',
          hovertemplate: this.getHoverTemplate(),
          automargin: true,
          name: ''
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
        yaxis: {
          automargin: true
        },
        xaxis: {
          automargin: true,
          title: {
            text: '(' + this.energyUnit + ')',
            font: {
              size: 12,
              family: 'Arial'
            }
          }
        },
        font: {
          family: 'Arial'
        }
      };

      let config = {
        modeBarButtonsToRemove: ['lasso2d', 'select2d', 'toggleSpikelines', 'hoverClosestCartesian', 'hoverCompareCartesian'],
        displaylogo: false,
        responsive: true
      };
      this.plotlyService.newPlot(this.energyUseDonut.nativeElement, data, layout, config);
    }
  }

  getHoverTemplate(): string {
    if (this.dataType == 'energyUse') {
      this.energyUnit = this.selectedFacility.energyUnit;
      this.titleText = '<b>Utility Usage Breakdown</b>'
      return '%{x:,.0f} ' + this.energyUnit;
    } else if (this.dataType == 'cost') {
      this.energyUnit = '$';
      this.titleText = '<b>Utility Cost Breakdown</b>';
      return '%{x:$,.0f}';
    } else if (this.dataType == 'emissions') {
      this.energyUnit = 'tonne CO<sub>2</sub>e';
      this.titleText = '<b>Emission Breakdown</b>';
      return '%{x:,.0f} tonne CO<sub>2</sub>e';
    } else if (this.dataType == 'water') {
      this.energyUnit = this.selectedFacility.volumeLiquidUnit;
      this.titleText = '<b>Water Consumption Breakdown</b>';
      return '%{x:,.0f} ' + this.energyUnit;
    }
  }
  
  getValues(): Array<number> {
    if (this.dataType == 'energyUse' || this.dataType == 'water') {
      return this.facilityOverviewMeters.map(meterOverview => { return meterOverview.totalUsage });
    } else if (this.dataType == 'cost') {
      return this.facilityOverviewMeters.map(meterOverview => { return meterOverview.totalCost });
    } else if (this.dataType == 'emissions') {
      if (this.emissionsDisplay == 'location') {
        return this.facilityOverviewMeters.map(meterOverview => { return meterOverview.emissions.totalWithLocationEmissions });
      } else {
        return this.facilityOverviewMeters.map(meterOverview => { return meterOverview.emissions.totalWithMarketEmissions });
      }
    }
  }
}
