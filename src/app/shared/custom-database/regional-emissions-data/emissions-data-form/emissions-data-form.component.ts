import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { CustomEmissionsDbService } from 'src/app/indexedDB/custom-emissions-db.service';
import { EGridService } from 'src/app/shared/helper-services/e-grid.service';
import * as _ from 'lodash';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { firstValueFrom } from 'rxjs';
import { EmissionsRate, SubregionEmissions } from 'src/app/models/eGridEmissions';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { getNewAccountEmissionsItem, IdbCustomEmissionsItem } from 'src/app/models/idbModels/customEmissions';
import { ConvertValue } from 'src/app/calculations/conversions/convertValue';

@Component({
  selector: 'app-emissions-data-form',
  templateUrl: './emissions-data-form.component.html',
  styleUrls: ['./emissions-data-form.component.css'],
  standalone: false
})
export class EmissionsDataFormComponent implements OnInit {

  isAdd: boolean;
  editCustomEmissions: IdbCustomEmissionsItem;
  years: Array<number>;
  isInvalid: boolean;
  invalidResidual: string;
  invalidLocation: string;
  subregionInvalid: string;
  previousSubregion: string;
  selectedAccount: IdbAccount;
  constructor(private router: Router, private customEmissionsDbService: CustomEmissionsDbService, private accountDbService: AccountdbService,
    private eGridService: EGridService, private loadingService: LoadingService, private toastNotificationService: ToastNotificationsService,
    private activatedRoute: ActivatedRoute, private facilityDbService: FacilitydbService, private dbChangesService: DbChangesService) { }

  ngOnInit(): void {
    this.setYears();
    this.isAdd = this.router.url.includes('add');
    this.selectedAccount = this.accountDbService.selectedAccount.getValue();
    if (this.isAdd) {
      this.editCustomEmissions = getNewAccountEmissionsItem(this.selectedAccount.guid);
      this.addLocationEmissionRate();
      this.addResidualEmissionRate();
    } else {
      this.activatedRoute.params.subscribe(params => {
        let elementId: string = params['id'];
        let customEmissionsItems: Array<IdbCustomEmissionsItem> = this.customEmissionsDbService.accountEmissionsItems.getValue();
        let selectedItem: IdbCustomEmissionsItem = customEmissionsItems.find(item => { return item.guid == elementId });
        this.previousSubregion = selectedItem.subregion;
        this.editCustomEmissions = JSON.parse(JSON.stringify(selectedItem));
        this.editCustomEmissions.residualEmissionRates = _.orderBy(this.editCustomEmissions.residualEmissionRates, 'year', 'asc');
        this.editCustomEmissions.locationEmissionRates = _.orderBy(this.editCustomEmissions.locationEmissionRates, 'year', 'asc');
        this.checkInvalid();
      });
    }
  }


  addLocationEmissionRate() {
    this.editCustomEmissions.locationEmissionRates.push({
      year: undefined,
      co2Emissions: undefined,
      CO2: undefined,
      N2O: undefined,
      CH4: undefined
    });
    this.checkInvalid();
  }

  addResidualEmissionRate() {
    this.editCustomEmissions.residualEmissionRates.push({
      year: undefined,
      co2Emissions: undefined,
      CO2: undefined,
      N2O: undefined,
      CH4: undefined
    });
    this.checkInvalid();
  }

  setYears() {
    this.years = new Array();
    let currentYear: number = new Date().getFullYear();
    for (let i = 1990; i <= currentYear; i++) {
      this.years.push(i);
    }
  }

  checkInvalid() {
    this.checkSubregionInvalid();
    this.checkLocationInvalid();
    this.checkResidualInvalid();
    this.isInvalid = (this.invalidLocation != undefined || this.invalidResidual != undefined || this.subregionInvalid != undefined);
  }

  checkSubregionInvalid() {
    let subregionInvalid: string = undefined;
    if (!this.editCustomEmissions.subregion) {
      subregionInvalid = 'Subregion name required.';
    } else {
      let checkExists: SubregionEmissions = this.eGridService.co2Emissions.find(emissions => { return emissions.subregion.toLowerCase() == this.editCustomEmissions.subregion.toLowerCase() });
      if (checkExists) {
        if (this.isAdd || (this.previousSubregion != checkExists.subregion)) {
          subregionInvalid = 'Unique name required for subregion. Current name already exists.';
        }
      }
    }
    this.subregionInvalid = subregionInvalid;
  }

  checkLocationInvalid() {
    this.invalidLocation = this.checkEmissionsDataInvalid(this.editCustomEmissions.locationEmissionRates);
  }

  checkResidualInvalid() {
    this.invalidResidual = this.checkEmissionsDataInvalid(this.editCustomEmissions.residualEmissionRates);
  }


  checkEmissionsDataInvalid(emissionsData: Array<{ co2Emissions: number; year: number; }>): string {
    let emissionsValues: Array<number> = emissionsData.map(data => { return data.co2Emissions });
    let hasUndefined: number = emissionsValues.findIndex(val => { return isNaN(val) || val == undefined || val < 0 });
    if (hasUndefined != -1) {
      return 'Invalid value found for emissions';
    }
    let yearValues: Array<number> = emissionsData.map(data => { return data.year });
    hasUndefined = yearValues.findIndex(val => { return isNaN(val) });
    if (hasUndefined != -1) {
      return 'Year needed for all emissions rates.';
    }
    let uniqVals: Array<number> = _.uniq(yearValues);
    if (uniqVals.length != yearValues.length) {
      return 'Cannot have multiple emissions rates for the same year.'
    }
    return undefined;
  }

  async save() {
    let successMessage: string;
    if (this.isAdd) {
      this.loadingService.setLoadingMessage('Adding Subgregion...');
      this.loadingService.setLoadingStatus(true);
      this.editCustomEmissions = await firstValueFrom(this.customEmissionsDbService.addWithObservable(this.editCustomEmissions));
      successMessage = 'Custom Emissions Added!';
    } else {
      this.loadingService.setLoadingMessage('Editing Subgregion...');
      this.loadingService.setLoadingStatus(true);
      await firstValueFrom(this.customEmissionsDbService.updateWithObservable(this.editCustomEmissions));
      let hasUpdatedValues: boolean = false;
      //update account and facilities previously referencing this subregion
      if (this.selectedAccount.eGridSubregion == this.previousSubregion) {
        this.selectedAccount.eGridSubregion = this.editCustomEmissions.subregion;
        await firstValueFrom(this.accountDbService.updateWithObservable(this.selectedAccount));
        this.accountDbService.selectedAccount.next(this.selectedAccount);
        hasUpdatedValues = true;
      }
      let accountFacilites: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
      for (let i = 0; i < accountFacilites.length; i++) {
        let facility: IdbFacility = accountFacilites[i];
        if (facility.eGridSubregion == this.previousSubregion) {
          facility.eGridSubregion = this.editCustomEmissions.subregion;
          await firstValueFrom(this.facilityDbService.updateWithObservable(facility));
          hasUpdatedValues = true;
        }
      }
      if (hasUpdatedValues) {
        this.dbChangesService.selectAccount(this.selectedAccount, false);
      }
      successMessage = 'Custom Emissions Updated!'
    }

    let customEmissionsItems: Array<IdbCustomEmissionsItem> = await this.customEmissionsDbService.getAllAccountCustomEmissions(this.editCustomEmissions.accountId);
    this.customEmissionsDbService.accountEmissionsItems.next(customEmissionsItems);
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationService.showToast(successMessage, undefined, undefined, false, 'alert-success');
    this.navigateHome();
  }

  navigateHome() {
    if (this.isAdd) {
      this.router.navigate(['../'], { relativeTo: this.activatedRoute });
    } else {
      this.router.navigate(['../../'], { relativeTo: this.activatedRoute });
    }
  }
  
  deleteLocationEmissions(index: number) {
    this.editCustomEmissions.locationEmissionRates.splice(index, 1);
  }

  deleteResidualEmissions(index: number) {
    this.editCustomEmissions.residualEmissionRates.splice(index, 1);
  }

  setOutputRate() {
    if (!this.editCustomEmissions.directEmissionsRate) {
      this.editCustomEmissions.locationEmissionRates.forEach(emissionRate => {
        emissionRate.co2Emissions = this.getOutputRate(emissionRate);
      });
      this.editCustomEmissions.residualEmissionRates.forEach(emissionRate => {
        emissionRate.co2Emissions = this.getOutputRate(emissionRate);
      });
    }
    this.checkResidualInvalid();
    this.checkLocationInvalid();
  }

  getOutputRate(emissionRate: EmissionsRate): number {
    let CO2: number = emissionRate.CO2;
    let CH4: number = emissionRate.CH4;
    let N2O: number = emissionRate.N2O;
    if (this.selectedAccount.energyUnit != 'MMBtu') {
      let conversionHelper: number = new ConvertValue(1, 'MMBtu', this.selectedAccount.energyUnit).convertedValue;
      CO2 = CO2 / conversionHelper;
      CH4 = CH4 / conversionHelper;
      N2O = N2O / conversionHelper;
    }
    //Calculate and save output rate using AR5 values (28/265)
    //Emissions calculations use settings
    let results: number = CO2 + (CH4 * (28 / 1000)) + (N2O * (265 / 1000));
    const factor = Math.pow(10, 4);
    return Math.round(results * factor) / factor;
  }
}
