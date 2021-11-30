import { Component, Input, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbAccount, IdbFacility } from 'src/app/models/idb';
import { EGridService, SubRegionData, SubregionEmissions } from 'src/app/shared/helper-services/e-grid.service';
import { EnergyUnitOptions, MassUnitOptions, UnitOption, VolumeGasOptions, VolumeLiquidOptions } from 'src/app/shared/unitOptions';
import { AccountManagementService } from '../account-management.service';
import * as _ from 'lodash';

@Component({
  selector: 'app-default-units-form',
  templateUrl: './default-units-form.component.html',
  styleUrls: ['./default-units-form.component.css']
})
export class DefaultUnitsFormComponent implements OnInit {
  @Input()
  inAccount: boolean;


  form: FormGroup;

  energyUnitOptions: Array<UnitOption> = EnergyUnitOptions;
  volumeGasOptions: Array<UnitOption> = VolumeGasOptions;
  volumeLiquidOptions: Array<UnitOption> = VolumeLiquidOptions;
  massUnitOptions: Array<UnitOption> = MassUnitOptions;

  selectedFacilitySub: Subscription;
  selectedAccountSub: Subscription;
  selectedAccount: IdbAccount;
  selectedFacility: IdbFacility;
  unitsDontMatchAccount: boolean = false;
  isFormChange: boolean = false
  subregions: Array<{
    subregion: string,
    outputRate: number
  }>;
  zipCodeSubRegionData: Array<string>;
  currentZip: string;
  constructor(private accountDbService: AccountdbService, private accountManagementService: AccountManagementService, private facilityDbService: FacilitydbService,
    private eGridService: EGridService) { }

  ngOnInit(): void {
    this.selectedAccountSub = this.accountDbService.selectedAccount.subscribe(account => {
      this.selectedAccount = account;
      if (account && this.inAccount) {
        if (this.isFormChange == false) {
          this.form = this.accountManagementService.getUnitsForm(account);
          this.checkCurrentZip();
        } else {
          this.isFormChange = false;
        }
      }
    });

    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(facility => {
      this.selectedFacility = facility;
      if (facility && !this.inAccount) {
        this.checkUnitsDontMatch();
        if (this.isFormChange == false) {
          this.form = this.accountManagementService.getUnitsForm(facility);
          this.checkCurrentZip();
        } else {
          this.isFormChange = false;
        }
      }
    });
  }

  ngOnDestroy() {
    this.selectedAccountSub.unsubscribe();
    this.selectedFacilitySub.unsubscribe();
  }

  setUnitsOfMeasure() {
    this.form = this.accountManagementService.setUnitsOfMeasure(this.form);
    this.saveChanges();
  }

  saveChanges() {
    this.form = this.accountManagementService.checkCustom(this.form);
    this.isFormChange = true;
    if (this.inAccount) {
      this.selectedAccount = this.accountManagementService.updateAccountFromUnitsForm(this.form, this.selectedAccount);
      this.accountDbService.update(this.selectedAccount);
    }
    if (!this.inAccount) {
      this.selectedFacility = this.accountManagementService.updateFacilityFromUnitsForm(this.form, this.selectedFacility);
      this.facilityDbService.update(this.selectedFacility);
    }
  }

  setAccountUnits() {
    this.form = this.accountManagementService.setAccountUnits(this.form, this.selectedAccount);
    this.saveChanges();
  }

  checkUnitsDontMatch() {
    this.unitsDontMatchAccount = this.accountManagementService.areAccountAndFacilityUnitsDifferent(this.selectedAccount, this.selectedFacility);
  }

  checkCurrentZip() {
    if (!this.form.controls.customEmissionsRate.value) {
      if (this.inAccount && this.currentZip != this.selectedAccount.zip) {
        this.currentZip = this.selectedAccount.zip;
        this.setSubRegionData();
      } else if (this.currentZip != this.selectedFacility.zip) {
        this.currentZip = this.selectedFacility.zip;
        this.setSubRegionData();
      }
    }
  }

  setSubRegionData() {
    this.zipCodeSubRegionData = new Array();
    if (this.currentZip.length == 5) {
      let subRegionData: SubRegionData = _.find(this.eGridService.subRegionsByZipcode, (val) => { return val.zip == this.currentZip });
      if (subRegionData) {
        subRegionData.subregions.forEach(subregion => {
          if (subregion) {
            this.zipCodeSubRegionData.push(subregion);
          }
        });
        if (this.zipCodeSubRegionData.length > 0) {
          let checkExists: string = this.zipCodeSubRegionData.find(val => { return this.form.controls.eGridSubregion.value === val; })
          if (!checkExists) {
            this.form.controls.eGridSubregion.patchValue(this.zipCodeSubRegionData[0]);
            this.setSubRegionEmissionsOutput();
          }
        }
      } else {
        this.form.controls.eGridSubregion.patchValue(undefined);
        this.form.patchValue({
          emissionsOutputRate: undefined
        });
      }
    } else {
      this.form.controls.eGridSubregion.patchValue(undefined);
      this.form.patchValue({
        emissionsOutputRate: undefined
      });
    }
  }

  setSubRegionEmissionsOutput() {
    let subregionEmissions: SubregionEmissions = _.find(this.eGridService.co2Emissions, (val) => { return this.form.controls.eGridSubregion.value === val.subregion; });
    if (subregionEmissions) {
      this.form.patchValue({
        emissionsOutputRate: subregionEmissions.co2Emissions
      });
      this.saveChanges();
    }
  }

  toggleCustomEmissionsRate() {
    if (this.form.controls.customEmissionsRate.value) {
      this.form.controls.customEmissionsRate.patchValue(false);
      this.form.controls.eGridSubregion.patchValue(undefined);
      this.setSubRegionData();
    } else {
      this.form.controls.customEmissionsRate.patchValue(true);
      this.saveChanges();
    }
  }
}
