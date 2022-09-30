import { Component, Input, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbAccount, IdbCustomEmissionsItem, IdbFacility } from 'src/app/models/idb';
import { EGridService, SubRegionData, SubregionEmissions } from 'src/app/shared/helper-services/e-grid.service';
import { EnergyUnitOptions, MassUnitOptions, UnitOption, VolumeGasOptions, VolumeLiquidOptions } from 'src/app/shared/unitOptions';
import * as _ from 'lodash';
import { SettingsFormsService } from '../settings-forms.service';
import { SetupWizardService } from 'src/app/setup-wizard/setup-wizard.service';
import { CustomEmissionsDbService } from 'src/app/indexedDB/custom-emissions-db.service';
import { Router } from '@angular/router';
import { SharedDataService } from '../../helper-services/shared-data.service';

@Component({
  selector: 'app-default-units-form',
  templateUrl: './default-units-form.component.html',
  styleUrls: ['./default-units-form.component.css']
})
export class DefaultUnitsFormComponent implements OnInit {
  @Input()
  inAccount: boolean;
  @Input()
  inWizard: boolean;


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
  zipCodeSubRegionData: Array<string> = new Array();
  currentZip: string;
  selectedSubregionEmissions: SubregionEmissions;
  openEmissionsRates: boolean = false;
  constructor(private accountDbService: AccountdbService, private settingsFormsService: SettingsFormsService,
    private facilityDbService: FacilitydbService,
    private eGridService: EGridService,
    private setupWizardService: SetupWizardService,
    private customEmissionsDbService: CustomEmissionsDbService,
    private router: Router,
    private sharedDataService: SharedDataService) { }

  ngOnInit(): void {
    if (!this.inWizard) {
      this.selectedAccountSub = this.accountDbService.selectedAccount.subscribe(account => {
        this.selectedAccount = account;
        if (account && this.inAccount) {
          if (this.isFormChange == false) {
            this.form = this.settingsFormsService.getUnitsForm(account);
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
            this.form = this.settingsFormsService.getUnitsForm(facility);
            this.checkCurrentZip();
          } else {
            this.isFormChange = false;
          }
        }
      });
    } else {
      this.selectedAccountSub = this.setupWizardService.account.subscribe(account => {
        this.selectedAccount = account;
        if (account && this.inAccount) {
          if (this.isFormChange == false) {
            this.form = this.settingsFormsService.getUnitsForm(account);
            this.checkCurrentZip();
          } else {
            this.isFormChange = false;
          }
        }
      });

      this.selectedFacilitySub = this.setupWizardService.selectedFacility.subscribe(facility => {
        this.selectedFacility = facility;
        if (facility && !this.inAccount) {
          this.checkUnitsDontMatch();
          if (this.isFormChange == false) {
            this.form = this.settingsFormsService.getUnitsForm(facility);
            this.checkCurrentZip();
          } else {
            this.isFormChange = false;
          }
        }
      });
    }
  }

  ngOnDestroy() {
    this.selectedAccountSub.unsubscribe();
    this.selectedFacilitySub.unsubscribe();
  }

  setUnitsOfMeasure() {
    this.form = this.settingsFormsService.setUnitsOfMeasure(this.form);
    this.saveChanges();
  }

  async saveChanges() {
    this.form = this.settingsFormsService.checkCustom(this.form);
    this.isFormChange = true;
    if (!this.inWizard) {
      if (this.inAccount) {
        this.selectedAccount = this.settingsFormsService.updateAccountFromUnitsForm(this.form, this.selectedAccount);
        let updatedAccount: IdbAccount = await this.accountDbService.updateWithObservable(this.selectedAccount).toPromise();
        let allAccounts: Array<IdbAccount> = await this.accountDbService.getAll().toPromise();
        this.accountDbService.selectedAccount.next(updatedAccount);
        this.accountDbService.allAccounts.next(allAccounts);
      }
      if (!this.inAccount) {
        this.selectedFacility = this.settingsFormsService.updateFacilityFromUnitsForm(this.form, this.selectedFacility);
        let updatedFacility: IdbFacility = await this.facilityDbService.updateWithObservable(this.selectedFacility).toPromise();
        let allFacilities: Array<IdbFacility> = await this.facilityDbService.getAll().toPromise();
        this.facilityDbService.selectedFacility.next(updatedFacility);
        let accountFacilities: Array<IdbFacility> = allFacilities.filter(facility => { return facility.accountId == this.selectedFacility.accountId });
        this.facilityDbService.accountFacilities.next(accountFacilities);
      }
    } else {
      if (this.inAccount) {
        this.selectedAccount = this.settingsFormsService.updateAccountFromUnitsForm(this.form, this.selectedAccount);
        this.setupWizardService.account.next(this.selectedAccount);
      }
      if (!this.inAccount) {
        this.selectedFacility = this.settingsFormsService.updateFacilityFromUnitsForm(this.form, this.selectedFacility);
        this.setupWizardService.selectedFacility.next(this.selectedFacility);
      }
    }
  }

  setAccountUnits() {
    this.form = this.settingsFormsService.setAccountUnits(this.form, this.selectedAccount);
    this.saveChanges();
  }

  checkUnitsDontMatch() {
    this.unitsDontMatchAccount = this.settingsFormsService.areAccountAndFacilityUnitsDifferent(this.selectedAccount, this.selectedFacility);
  }

  checkCurrentZip() {
    if (this.inAccount && ((this.currentZip != this.selectedAccount.zip) || !this.selectedAccount.zip)) {
      this.currentZip = this.selectedAccount.zip;
      this.setSubRegionData();
    } else if (!this.inAccount && ((this.currentZip != this.selectedFacility.zip) || !this.selectedFacility.zip)) {
      this.currentZip = this.selectedFacility.zip;
      this.setSubRegionData();
    }
  }

  setSubRegionData() {
    this.zipCodeSubRegionData = new Array();
    this.addCustomSubregions();
    if (this.currentZip && this.currentZip.length == 5) {
      let subRegionData: SubRegionData = _.find(this.eGridService.subRegionsByZipcode, (val) => { return val.zip == this.currentZip });
      if (subRegionData) {
        subRegionData.subregions.forEach(subregion => {
          if (subregion) {
            this.zipCodeSubRegionData.unshift(subregion);
          }
        });
      }
    }
    let checkExists: string = this.zipCodeSubRegionData.find(val => { return this.form.controls.eGridSubregion.value === val; })
    if (!checkExists || checkExists == 'U.S. Average') {
      this.form.controls.eGridSubregion.patchValue(this.zipCodeSubRegionData[0]);
    }
    this.setSelectedSubregionEmissions();
  }

  addCustomSubregions() {
    let customSubRegions: Array<IdbCustomEmissionsItem> = this.customEmissionsDbService.accountEmissionsItems.getValue();
    customSubRegions.forEach(customSubregion => {
      this.zipCodeSubRegionData.push(customSubregion.subregion)
    });
  }

  setSelectedSubregionEmissions() {
    this.selectedSubregionEmissions = this.eGridService.co2Emissions.find(region => { return this.form.controls.eGridSubregion.value === region.subregion; });
    this.saveChanges();
  }

  showEmissionsRates() {
    this.openEmissionsRates = true;
    this.sharedDataService.modalOpen.next(true);
  }

  closeEmissionsRates() {
    this.openEmissionsRates = false;
    this.sharedDataService.modalOpen.next(false);
  }

  goToCustomData(){
    this.router.navigateByUrl('/account/custom-data/emissions')
  }
}
