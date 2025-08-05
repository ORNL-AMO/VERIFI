import { Component, Input, SimpleChanges } from '@angular/core';
import { IUseAndCost } from 'src/app/calculations/dashboard-calculations/useAndCostClass';
import { Subscription } from 'rxjs';
import { AccountOverviewService } from 'src/app/data-evaluation/account/account-overview/account-overview.service';
import { FacilityOverviewService } from 'src/app/data-evaluation/facility/facility-overview/facility-overview.service';

@Component({
    selector: 'app-emissions-consumption-table',
    templateUrl: './emissions-consumption-table.component.html',
    styleUrls: ['./emissions-consumption-table.component.css'],
    standalone: false
})
export class EmissionsConsumptionTableComponent {
  @Input()
  facilityId: string;
  @Input()
  useAndCostTotal: {
    average: IUseAndCost;
    end: IUseAndCost
    previousYear: IUseAndCost;
  };
  @Input()
  dateRange: { startDate: Date, endDate: Date };
  @Input()
  previousYear: Date;


  emissionsDisplay: "market" | "location";
  emissionsDisplaySub: Subscription;

  showMobile: boolean;
  showFugitive: boolean;
  showProcess: boolean;
  showStationary: boolean;
  showScope2LocationElectricity: boolean;
  showScope2MarketElectricity: boolean;
  showScope2Other: boolean;
  constructor(private accountOverviewService: AccountOverviewService, private facilityOverviewService: FacilityOverviewService) { }

  ngOnInit(): void {
    if (!this.facilityId) {
      //ACCOUNT
      this.emissionsDisplaySub = this.accountOverviewService.emissionsDisplay.subscribe(val => {
        this.emissionsDisplay = val;
      });

    } else {
      //FACILITY
      this.emissionsDisplaySub = this.facilityOverviewService.emissionsDisplay.subscribe(val => {
        this.emissionsDisplay = val;
      });
    }
  }

  ngOnDestroy() {
    if (this.emissionsDisplaySub) {
      this.emissionsDisplaySub.unsubscribe();
    }
  }

  ngOnChanges() {
    this.setShowBooleans();
  }

  setShowBooleans() {
    if (this.useAndCostTotal) {
      this.showMobile = (
        this.checkValue(this.useAndCostTotal.average.mobileTotalEmissions) ||
        this.checkValue(this.useAndCostTotal.end.mobileTotalEmissions) ||
        this.checkValue(this.useAndCostTotal.previousYear.mobileTotalEmissions)
      );
      this.showFugitive = (
        this.checkValue(this.useAndCostTotal.average.fugitiveEmissions) ||
        this.checkValue(this.useAndCostTotal.end.fugitiveEmissions) ||
        this.checkValue(this.useAndCostTotal.previousYear.fugitiveEmissions)
      )
      this.showProcess = (
        this.checkValue(this.useAndCostTotal.average.processEmissions) ||
        this.checkValue(this.useAndCostTotal.end.processEmissions) ||
        this.checkValue(this.useAndCostTotal.previousYear.processEmissions)
      )
      this.showStationary = (
        this.checkValue(this.useAndCostTotal.average.stationaryEmissions) ||
        this.checkValue(this.useAndCostTotal.end.stationaryEmissions) ||
        this.checkValue(this.useAndCostTotal.previousYear.stationaryEmissions)
      )
      this.showScope2LocationElectricity = (
        this.checkValue(this.useAndCostTotal.average.locationElectricityEmissions) ||
        this.checkValue(this.useAndCostTotal.end.locationElectricityEmissions) ||
        this.checkValue(this.useAndCostTotal.previousYear.locationElectricityEmissions)
      )
      this.showScope2MarketElectricity = (
        this.checkValue(this.useAndCostTotal.average.marketElectricityEmissions) ||
        this.checkValue(this.useAndCostTotal.end.marketElectricityEmissions) ||
        this.checkValue(this.useAndCostTotal.previousYear.marketElectricityEmissions)
      )
      this.showScope2Other = (
        this.checkValue(this.useAndCostTotal.average.otherScope2Emissions) ||
        this.checkValue(this.useAndCostTotal.end.otherScope2Emissions) ||
        this.checkValue(this.useAndCostTotal.previousYear.otherScope2Emissions)
      );
    }
  }

  checkValue(value: number): boolean {
    if (value) {
      return true;
    }
    return false;
  }

}
