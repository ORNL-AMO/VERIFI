import { Component, ElementRef, ViewChild, Input, SimpleChanges } from '@angular/core';
import * as _ from 'lodash';
import { Subscription } from 'rxjs';
import { PlotlyService } from 'angular-plotly.js';
import { FacilityOverviewService } from 'src/app/facility/facility-overview/facility-overview.service';
import { FacilityOverviewMeter } from 'src/app/calculations/dashboard-calculations/facilityOverviewClass';
import { EmissionsResults, EmissionsTypes, getEmissionsTypeColor, getEmissionsTypes } from 'src/app/models/eGridEmissions';
import { AccountOverviewFacility } from 'src/app/calculations/dashboard-calculations/accountOverviewClass';
import { AccountOverviewService } from 'src/app/account/account-overview/account-overview.service';

@Component({
    selector: 'app-emissions-donut',
    templateUrl: './emissions-donut.component.html',
    styleUrls: ['./emissions-donut.component.css'],
    standalone: false
})
export class EmissionsDonutComponent {
  @Input()
  facilityId: string;
  @Input()
  facilityOverviewMeters: Array<FacilityOverviewMeter>;
  @Input()
  accountOverviewFacility: Array<AccountOverviewFacility>;
  @Input()
  inHomeScreen: boolean;

  @ViewChild('emissionsDonut', { static: false }) emissionsDonut: ElementRef;
  emissionsDisplay: 'market' | 'location';
  emissionsDisplaySub: Subscription;

  constructor(private plotlyService: PlotlyService, private facilityOverviewService: FacilityOverviewService,
    private accountOverviewService: AccountOverviewService) { }

  ngOnInit(): void {
    if (this.facilityId) {
      this.emissionsDisplaySub = this.facilityOverviewService.emissionsDisplay.subscribe(val => {
        this.emissionsDisplay = val;
        this.drawChart();
      });
    } else {
      this.emissionsDisplaySub = this.accountOverviewService.emissionsDisplay.subscribe(val => {
        this.emissionsDisplay = val;
        this.drawChart();
      });
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
    if (!changes.dataType || (changes.facilityOverviewMeters && !changes.facilityOverviewMeters.isFirstChange())) {
      this.drawChart();
    }
  }

  drawChart() {
    if (this.emissionsDonut && (this.facilityOverviewMeters || this.accountOverviewFacility)) {
      let emissionsTypes: Array<EmissionsTypes> = getEmissionsTypes(this.emissionsDisplay);
      let valuesAndTypes: { values: Array<number>, includedEmissionsTypes: Array<EmissionsTypes> } = this.getValues(emissionsTypes);
      var data = [{
        values: valuesAndTypes.values,
        labels: valuesAndTypes.includedEmissionsTypes.map(eType => { return eType }),
        marker: {
          colors: valuesAndTypes.includedEmissionsTypes.map(eType => { return getEmissionsTypeColor(eType) }),
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
        displayModeBar: true,
        displaylogo: false,
        responsive: true
      }
      this.plotlyService.newPlot(this.emissionsDonut.nativeElement, data, layout, config);
    }
  }



  getValues(emissionsTypes: Array<EmissionsTypes>): { values: Array<number>, includedEmissionsTypes: Array<EmissionsTypes> } {
    let allEmissions: Array<EmissionsResults>;
    if (this.facilityOverviewMeters) {
      allEmissions = this.facilityOverviewMeters.flatMap(overviewMeter => {
        return overviewMeter.emissions;
      })
    } else if (this.accountOverviewFacility) {
      allEmissions = this.accountOverviewFacility.flatMap(overviewFacility => {
        return overviewFacility.emissions;
      })
    }
    let values: Array<number> = new Array();
    let includedEmissionsTypes: Array<EmissionsTypes> = new Array();
    emissionsTypes.forEach(eType => {
      if (eType == 'Scope 1: Fugitive' && allEmissions.findIndex(emissions => { return emissions.fugitiveEmissions != 0 }) != -1) {
        values.push(_.sumBy(allEmissions, (emissions: EmissionsResults) => {
          return emissions.fugitiveEmissions
        }));
        includedEmissionsTypes.push(eType);
      } else if (eType == 'Scope 2: Electricity (Location)' && allEmissions.findIndex(emissions => { return emissions.locationElectricityEmissions != 0 }) != -1) {
        values.push(_.sumBy(allEmissions, (emissions: EmissionsResults) => {
          return emissions.locationElectricityEmissions;
        }));
        includedEmissionsTypes.push(eType);
      } else if (eType == 'Scope 2: Electricity (Market)' && allEmissions.findIndex(emissions => { return emissions.marketElectricityEmissions != 0 }) != -1) {
        values.push(_.sumBy(allEmissions, (emissions: EmissionsResults) => {
          if (emissions.marketElectricityEmissions > 0) {
            return emissions.marketElectricityEmissions;
          } else {
            return 0;
          }
        }));
        includedEmissionsTypes.push(eType);
      } else if (eType == 'Scope 1: Mobile' && allEmissions.findIndex(emissions => { return emissions.mobileTotalEmissions != 0 }) != -1) {
        values.push(_.sumBy(allEmissions, (emissions: EmissionsResults) => {
          return emissions.mobileTotalEmissions
        }));
        includedEmissionsTypes.push(eType);
      } else if (eType == 'Scope 1: Process' && allEmissions.findIndex(emissions => { return emissions.processEmissions != 0 }) != -1) {
        values.push(_.sumBy(allEmissions, (emissions: EmissionsResults) => {
          return emissions.processEmissions
        }));
        includedEmissionsTypes.push(eType);
      } else if (eType == 'Scope 1: Stationary' && allEmissions.findIndex(emissions => { return emissions.stationaryEmissions != 0 }) != -1) {
        values.push(_.sumBy(allEmissions, (emissions: EmissionsResults) => {
          return emissions.stationaryEmissions;
        }));
        includedEmissionsTypes.push(eType);
      } else if (eType == 'Scope 2: Other' && allEmissions.findIndex(emissions => { return emissions.otherScope2Emissions != 0 }) != -1) {
        values.push(_.sumBy(allEmissions, (emissions: EmissionsResults) => {
          return emissions.otherScope2Emissions;
        }));
        includedEmissionsTypes.push(eType);
      }
    })
    return { values: values, includedEmissionsTypes: includedEmissionsTypes };
  }
}
