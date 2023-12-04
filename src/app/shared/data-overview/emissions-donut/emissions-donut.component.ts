import { Component, ElementRef, ViewChild, Input, SimpleChanges } from '@angular/core';
import * as _ from 'lodash';
import { Subscription } from 'rxjs';
import { PlotlyService } from 'angular-plotly.js';
import { FacilityOverviewService } from 'src/app/facility/facility-overview/facility-overview.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility } from 'src/app/models/idb';
import { FacilityOverviewMeter } from 'src/app/calculations/dashboard-calculations/facilityOverviewClass';
import { EmissionsTypes, getEmissionsTypeColor, getEmissionsTypes } from 'src/app/models/eGridEmissions';

@Component({
  selector: 'app-emissions-donut',
  templateUrl: './emissions-donut.component.html',
  styleUrls: ['./emissions-donut.component.css']
})
export class EmissionsDonutComponent {
  @Input()
  facilityId: string;
  @Input()
  facilityOverviewMeters: Array<FacilityOverviewMeter>;
  @Input()
  inHomeScreen: boolean;

  @ViewChild('emissionsDonut', { static: false }) emissionsDonut: ElementRef;
  selectedFacility: IdbFacility;
  emissionsDisplay: 'market' | 'location';
  emissionsDisplaySub: Subscription;

  constructor(private plotlyService: PlotlyService, private facilityOverviewService: FacilityOverviewService,
    private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    this.selectedFacility = facilities.find(facility => { return facility.guid == this.facilityId });


    this.emissionsDisplaySub = this.facilityOverviewService.emissionsDisplay.subscribe(val => {
      this.emissionsDisplay = val;
      this.drawChart();
    });
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
    if (this.emissionsDonut && this.facilityOverviewMeters) {
      this.facilityOverviewMeters = _.orderBy(this.facilityOverviewMeters, (meterOverview) => { return meterOverview.meter.source });

      let emissionsTypes: Array<EmissionsTypes> = getEmissionsTypes(this.emissionsDisplay);
      var data = [{
        values: this.getValues(emissionsTypes),
        labels: emissionsTypes.map(eType => { return eType }),
        marker: {
          colors: emissionsTypes.map(eType => { return getEmissionsTypeColor(eType) }),
          line: {
            color: '#fff',
            width: 5
          }
        },
        texttemplate: '%{label}: (%{percent:.1%})',
        textposition: 'auto',
        insidetextorientation: "horizontal",
        hovertemplate: '%{label}: %{value:,.0f} tonne CO<sub>2</sub>e <extra></extra>',
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
        showlegend: false
      };

      let config = {
        displaylogo: false,
        responsive: true
      }
      this.plotlyService.newPlot(this.emissionsDonut.nativeElement, data, layout, config);
    }
  }



  getValues(emissionsTypes: Array<EmissionsTypes>): Array<number> {
    let values: Array<number> = new Array();
    emissionsTypes.forEach(eType => {
      if (eType == 'Fugitive') {
        values.push(_.sumBy(this.facilityOverviewMeters, (facilityData: FacilityOverviewMeter) => {
          return facilityData.emissions.fugitiveEmissions
        }));
      } else if (eType == 'Location') {
        values.push(_.sumBy(this.facilityOverviewMeters, (facilityData: FacilityOverviewMeter) => {
          return facilityData.emissions.locationEmissions
        }));
      } else if (eType == 'Market') {
        values.push(_.sumBy(this.facilityOverviewMeters, (facilityData: FacilityOverviewMeter) => {
          return facilityData.emissions.marketEmissions
        }));
      } else if (eType == 'Mobile') {
        values.push(_.sumBy(this.facilityOverviewMeters, (facilityData: FacilityOverviewMeter) => {
          return facilityData.emissions.mobileTotalEmissions
        }));
      } else if (eType == 'Process') {
        values.push(_.sumBy(this.facilityOverviewMeters, (facilityData: FacilityOverviewMeter) => {
          return facilityData.emissions.processEmissions
        }));
      }
    })
    return values;
  }
}
