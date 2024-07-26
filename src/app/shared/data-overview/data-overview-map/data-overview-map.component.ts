import { Component, ElementRef, Input, ViewChild, SimpleChanges } from '@angular/core';
import { PlotlyService } from 'angular-plotly.js';
import { Subscription } from 'rxjs';
import { AccountOverviewService } from 'src/app/account/account-overview/account-overview.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { EGridService } from '../../helper-services/e-grid.service';
import * as _ from 'lodash';
import { AccountOverviewFacility } from 'src/app/calculations/dashboard-calculations/accountOverviewClass';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
  selector: 'app-data-overview-map',
  templateUrl: './data-overview-map.component.html',
  styleUrls: ['./data-overview-map.component.css']
})
export class DataOverviewMapComponent {
  @Input()
  dataType: 'energyUse' | 'emissions' | 'cost' | 'water';
  @Input()
  accountOverviewFacilities: Array<AccountOverviewFacility>;


  @ViewChild('utilityUsageMap', { static: false }) utilityUsageMap: ElementRef;

  mapData: Array<{
    lng: string,
    lat: string,
    dataTypeAmount: number,
    facility: IdbFacility
  }>;

  emissionsDisplaySub: Subscription;
  emissionsDisplay: "market" | "location";
  constructor(private plotlyService: PlotlyService,
    private eGridService: EGridService, private accountDbService: AccountdbService,
    private accountOverviewService: AccountOverviewService) { }

  ngOnInit(): void {
    this.setMapData();

    if (this.dataType == 'emissions') {
      this.emissionsDisplaySub = this.accountOverviewService.emissionsDisplay.subscribe(val => {
        this.emissionsDisplay = val;
        if (this.emissionsDisplay) {
          this.setMapData();
          this.drawChart();
        }
      })
    }
  }

  ngOnDestroy() {
    if (this.dataType == 'emissions') {
      this.emissionsDisplaySub.unsubscribe();
    }
  }

  ngAfterViewInit() {
    this.drawChart();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!changes.dataType && !changes.accountOverviewFacilities.isFirstChange()) {
      this.setMapData();
      this.drawChart();
    }
  }

  drawChart() {
    if (this.utilityUsageMap && this.mapData && this.mapData.length != 0) {
      let cmax: number = _.maxBy(this.mapData, 'dataTypeAmount').dataTypeAmount;;
      // let lats: Array<number> = this.mapData.map(item => { return Number(item.lat) });
      // let lons: Array<number> = this.mapData.map(item => { return Number(item.lng) });

      var data = [{
        type: 'scattergeo',
        mode: 'markers',
        lat: this.mapData.map(item => { return item.lat }),
        lon: this.mapData.map(item => { return item.lng }),
        hovertext: this.getHoverData(),
        hoverinfo: 'text',
        text: this.mapData.map(item => { return item.facility.name }),
        marker: {
          text: this.mapData.map(item => { return item.facility.name }),
          size: this.mapData.map(item => { return (item.dataTypeAmount / cmax) * 25 + 10 }),
          color: this.mapData.map(item => { return item.dataTypeAmount }),
          cmin: 0,
          cmax: cmax,
          line: {
            color: 'black'
          },
          symbol: this.getSymbol()
        },
        name: this.getName(),

        // locationmode: "USA-states",
      }];

      var layout = {
        'geo': {
          scope: 'usa',
          resolution: 110,
          // projection: {
          //   type: 'albers usa'
          // },
          showland: true,
          landcolor: 'rgb(20, 90, 50)',
          subunitwidth: 1,
          countrywidth: 1,
          subunitcolor: 'rgb(255,255,255)',
          countrycolor: 'rgb(255,255,255)',
          // center:{
          //   lat: _.mean(lats),
          //   lon: _.mean(lons)
          // }
        },
        showlegend: false,
        margin: { "t": 0, "b": 50, "l": 0, "r": 50 },
      };

      let config = {
        displaylogo: false,
        responsive: true,
        scrollZoom: false
      }

      this.plotlyService.newPlot(this.utilityUsageMap.nativeElement, data, layout, config);
    }
  }

  setMapData() {
    this.mapData = new Array();
    this.accountOverviewFacilities.forEach(accountOverviewFacility => {
      let findLatLong = this.eGridService.zipLatLong.find(zipLL => { return zipLL.ZIP == accountOverviewFacility.facility.zip });
      if (findLatLong) {
        let dataTypeAmount: number;
        if (this.dataType == 'energyUse') {
          dataTypeAmount = accountOverviewFacility.totalUsage;
        } else if (this.dataType == 'cost') {
          dataTypeAmount = accountOverviewFacility.totalCost;
        } else if (this.dataType == 'emissions') {
          if (this.emissionsDisplay == 'location') {
            dataTypeAmount = accountOverviewFacility.emissions.totalWithLocationEmissions;
          } else {
            dataTypeAmount = accountOverviewFacility.emissions.totalWithMarketEmissions;
          }
        } else if (this.dataType == 'water') {
          dataTypeAmount = accountOverviewFacility.totalUsage;
        }
        this.mapData.push({
          facility: accountOverviewFacility.facility,
          lng: findLatLong.LNG,
          lat: findLatLong.LAT,
          dataTypeAmount: dataTypeAmount,
        });
      }
    })
  }

  getHoverData() {
    if (this.dataType == 'energyUse') {
      let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
      return this.mapData.map(item => { return item.facility.name + ': ' + (item.dataTypeAmount).toLocaleString(undefined, { maximumFractionDigits: 0, minimumIntegerDigits: 1 }) + ' ' + selectedAccount.energyUnit });
    } else if (this.dataType == 'cost') {
      return this.mapData.map(item => { return item.facility.name + ': $' + (item.dataTypeAmount).toLocaleString(undefined, { maximumFractionDigits: 0, minimumIntegerDigits: 1 }) });
    } else if (this.dataType == 'emissions') {
      return this.mapData.map(item => { return item.facility.name + ': ' + (item.dataTypeAmount).toLocaleString(undefined, { maximumFractionDigits: 0, minimumIntegerDigits: 1 }) + ' tonne CO<sub>2</sub>e' });
    } else if (this.dataType == 'water') {
      let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
      return this.mapData.map(item => { return item.facility.name + ': ' + (item.dataTypeAmount).toLocaleString(undefined, { maximumFractionDigits: 0, minimumIntegerDigits: 1 }) + ' ' + selectedAccount.volumeLiquidUnit });
    }
  }

  getSymbol() {
    if (this.dataType == 'energyUse') {
      return 'star-square';
    } else if (this.dataType == 'cost') {
      return 'diamond';
    } else if (this.dataType == 'emissions') {
      //nothing use default circle
      return;
    } else if (this.dataType == 'water') {
      return 'square';
    }
  }

  getName() {
    if (this.dataType == 'energyUse') {
      return 'Energy Use Data';
    } else if (this.dataType == 'cost') {
      return 'Energy Cost Data';
    } else if (this.dataType == 'emissions') {
      return 'Energy Emissions Data';
    } else if (this.dataType == 'water') {
      return 'Water Consumption Data';
    }
  }
}
