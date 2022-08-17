import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { CustomEmissionsDbService } from 'src/app/indexedDB/custom-emissions-db.service';
import { IdbAccount, IdbCustomEmissionsItem, IdbFacility } from 'src/app/models/idb';
import { EGridService, SubregionEmissions } from 'src/app/shared/helper-services/e-grid.service';
import * as _ from 'lodash';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';

@Component({
  selector: 'app-emissions-data-form',
  templateUrl: './emissions-data-form.component.html',
  styleUrls: ['./emissions-data-form.component.css']
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
  constructor(private router: Router, private customEmissionsDbService: CustomEmissionsDbService, private accountDbService: AccountdbService,
    private eGridService: EGridService, private loadingService: LoadingService, private toastNotificationService: ToastNotificationsService,
    private activatedRoute: ActivatedRoute, private facilityDbService: FacilitydbService, private dbChangesService: DbChangesService) { }

  ngOnInit(): void {
    this.setYears();
    this.isAdd = this.router.url.includes('add');
    if (this.isAdd) {
      let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
      this.editCustomEmissions = this.customEmissionsDbService.getNewAccountEmissionsItem(selectedAccount);
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
      co2Emissions: undefined
    });
    this.checkInvalid();
  }

  addResidualEmissionRate() {
    this.editCustomEmissions.residualEmissionRates.push({
      year: undefined,
      co2Emissions: undefined
    });
    this.checkInvalid();
  }

  setYears() {
    this.years = new Array();
    for (let i = 1990; i <= 2022; i++) {
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
      return 'Invalid number found for emissions';
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
      this.editCustomEmissions = await this.customEmissionsDbService.addWithObservable(this.editCustomEmissions).toPromise();
      successMessage = 'Custom Emissions Added!';
    } else {
      this.loadingService.setLoadingMessage('Editing Subgregion...');
      this.loadingService.setLoadingStatus(true);
      await this.customEmissionsDbService.updateWithObservable(this.editCustomEmissions).toPromise();
      let hasUpdatedValues: boolean = false;
      //update account and facilities previously referencing this subregion
      let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
      if (account.eGridSubregion == this.previousSubregion) {
        account.eGridSubregion = this.editCustomEmissions.subregion;
        await this.accountDbService.updateWithObservable(account).toPromise();
        this.accountDbService.selectedAccount.next(account);
        hasUpdatedValues = true;
      }
      let accountFacilites: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
      for (let i = 0; i < accountFacilites.length; i++) {
        let facility: IdbFacility = accountFacilites[i];
        if (facility.eGridSubregion == this.previousSubregion) {
          facility.eGridSubregion = this.editCustomEmissions.subregion;
          await this.facilityDbService.updateWithObservable(facility).toPromise();
          hasUpdatedValues = true;
        }
      }
      if (hasUpdatedValues) {
        this.dbChangesService.selectAccount(account);
      }
      successMessage = 'Custom Emissions Updated!'
    }

    let customEmissionsItems: Array<IdbCustomEmissionsItem> = await this.customEmissionsDbService.getAllByIndexRange('accountId', this.editCustomEmissions.accountId).toPromise();
    this.customEmissionsDbService.accountEmissionsItems.next(customEmissionsItems);
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationService.showToast(successMessage, undefined, undefined, false, 'success');
    this.navigateHome();
  }

  navigateHome() {
    this.router.navigateByUrl('/account/custom-data/emissions');
  }

  deleteLocationEmissions(index: number) {
    this.editCustomEmissions.locationEmissionRates.splice(index, 1);
  }

  deleteResidualEmissions(index: number) {
    this.editCustomEmissions.residualEmissionRates.splice(index, 1);
  }
}
