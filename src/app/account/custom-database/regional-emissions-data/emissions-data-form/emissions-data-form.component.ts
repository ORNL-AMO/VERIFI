import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { CustomEmissionsDbService } from 'src/app/indexedDB/custom-emissions-db.service';
import { IdbAccount, IdbCustomEmissionsItem } from 'src/app/models/idb';
import { EGridService, SubregionEmissions } from 'src/app/shared/helper-services/e-grid.service';
import * as _ from 'lodash';

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

  constructor(private router: Router, private customEmissionsDbService: CustomEmissionsDbService, private accountDbService: AccountdbService,
    private eGridService: EGridService, private cd: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.setYears();
    this.isAdd = this.router.url.includes('add');
    if (this.isAdd) {
      let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
      this.editCustomEmissions = this.customEmissionsDbService.getNewAccountEmissionsItem(selectedAccount);
      this.addLocationEmissionRate();
      this.addResidualEmissionRate();
    } else {

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
    // this.cd.detectChanges();
  }

  checkSubregionInvalid() {
    let subregionInvalid: string = undefined;
    if (!this.editCustomEmissions.subregion) {
      subregionInvalid = 'Subregion name required.';
    } else {
      let checkExists: SubregionEmissions = this.eGridService.co2Emissions.find(emissions => { return emissions.subregion == this.editCustomEmissions.subregion });
      if (checkExists) {
        subregionInvalid = 'Unique name required for subregion. Current name already exists.';
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
    let hasUndefined: number = emissionsValues.findIndex(val => { return isNaN(val) || val == undefined });
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

}
