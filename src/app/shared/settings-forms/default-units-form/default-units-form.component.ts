import { Component, Input, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Subscription, firstValueFrom } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { EGridService } from 'src/app/shared/helper-services/e-grid.service';
import { EnergyUnitOptions, MassUnitOptions, UnitOption, VolumeGasOptions, VolumeLiquidOptions } from 'src/app/shared/unitOptions';
import * as _ from 'lodash';
import { SettingsFormsService } from '../settings-forms.service';
import { SetupWizardService } from 'src/app/setup-wizard/setup-wizard.service';
import { CustomEmissionsDbService } from 'src/app/indexedDB/custom-emissions-db.service';
import { Router } from '@angular/router';
import { SharedDataService } from '../../helper-services/shared-data.service';
import { SubRegionData, SubregionEmissions } from 'src/app/models/eGridEmissions';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbCustomEmissionsItem } from 'src/app/models/idbModels/customEmissions';

@Component({
  selector: 'app-default-units-form',
  templateUrl: './default-units-form.component.html',
  styleUrls: ['./default-units-form.component.css'],
  standalone: false
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
            this.form.addControl('assessmentReportVersion', new FormControl(account.assessmentReportVersion))
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
            this.form.addControl('assessmentReportVersion', new FormControl(account.assessmentReportVersion))
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
        this.selectedAccount.assessmentReportVersion = this.form.controls.assessmentReportVersion.value;
        let updatedAccount: IdbAccount = await firstValueFrom(this.accountDbService.updateWithObservable(this.selectedAccount));
        let allAccounts: Array<IdbAccount> = await firstValueFrom(this.accountDbService.getAll());
        this.accountDbService.selectedAccount.next(updatedAccount);
        this.accountDbService.allAccounts.next(allAccounts);
      }
      if (!this.inAccount) {
        this.selectedFacility = this.settingsFormsService.updateFacilityFromUnitsForm(this.form, this.selectedFacility);
        let updatedFacility: IdbFacility = await firstValueFrom(this.facilityDbService.updateWithObservable(this.selectedFacility));
        let allFacilities: Array<IdbFacility> = await firstValueFrom(this.facilityDbService.getAll());
        this.facilityDbService.selectedFacility.next(updatedFacility);
        let accountFacilities: Array<IdbFacility> = allFacilities.filter(facility => { return facility.accountId == this.selectedFacility.accountId });
        this.facilityDbService.accountFacilities.next(accountFacilities);
      }
    } else {
      if (this.inAccount) {
        this.selectedAccount = this.settingsFormsService.updateAccountFromUnitsForm(this.form, this.selectedAccount);
        this.selectedAccount.assessmentReportVersion = this.form.controls.assessmentReportVersion.value;
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
    this.zipCodeSubRegionData = ['US Average'];
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
    let needSave: boolean = false;
    if (!checkExists || checkExists == 'U.S. Average') {
      if (this.form.controls.eGridSubregion.value != this.zipCodeSubRegionData[0]) {
        this.form.controls.eGridSubregion.patchValue(this.zipCodeSubRegionData[0]);
        needSave = true;
      }
    }
    this.setSelectedSubregionEmissions(needSave);
  }

  addCustomSubregions() {
    let customSubRegions: Array<IdbCustomEmissionsItem> = this.customEmissionsDbService.accountEmissionsItems.getValue();
    customSubRegions.forEach(customSubregion => {
      this.zipCodeSubRegionData.push(customSubregion.subregion)
    });
  }

  setSelectedSubregionEmissions(needSave: boolean) {
    this.selectedSubregionEmissions = this.eGridService.co2Emissions.find(region => { return this.form.controls.eGridSubregion.value === region.subregion; });
    if (needSave) {
      this.saveChanges();
    }
  }

  showEmissionsRates() {
    this.openEmissionsRates = true;
    this.sharedDataService.modalOpen.next(true);
  }

  closeEmissionsRates() {
    this.openEmissionsRates = false;
    this.sharedDataService.modalOpen.next(false);
  }

  goToCustomData() {
    this.router.navigateByUrl('/account/custom-data/emissions')
  }
}
