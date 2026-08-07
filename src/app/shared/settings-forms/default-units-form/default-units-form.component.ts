import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, Input, OnInit, inject, Injector } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';
import { EGridService } from 'src/app/shared/helper-services/e-grid.service';
import { EnergyUnitOptions, MassUnitOptions, UnitOption, VolumeGasOptions, VolumeLiquidOptions } from 'src/app/shared/unitOptions';
import * as _ from 'lodash';
import { SettingsFormsService } from '../settings-forms.service';
import { Router } from '@angular/router';
import { SharedDataService } from '../../helper-services/shared-data.service';
import { SubRegionData, SubregionEmissions } from 'src/app/models/eGridEmissions';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbCustomEmissionsItem } from 'src/app/models/idbModels/customEmissions';
import { WorkspaceCommandBoundary } from 'src/app/account-workspace/workspace-command-boundary.service';
import { AccountCommandHandler } from 'src/app/account-workspace/handlers/account-command-handler.service';
import { FacilityCommandHandler } from 'src/app/account-workspace/handlers/facility-command-handler.service';
import { ApplicationLifecycleService } from 'src/app/application-lifecycle/application-lifecycle.service';

@Component({
  selector: 'app-default-units-form',
  templateUrl: './default-units-form.component.html',
  styleUrls: ['./default-units-form.component.css'],
  standalone: false
})
export class DefaultUnitsFormComponent implements OnInit {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private readonly commandBoundary = inject(WorkspaceCommandBoundary);
  private readonly accountHandler = inject(AccountCommandHandler);
  private readonly facilityHandler = inject(FacilityCommandHandler);
  private readonly applicationLifecycleService = inject(ApplicationLifecycleService);
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
  zipCodeSubRegionData: Array<string> = new Array();
  currentZip: string;
  selectedSubregionEmissions: SubregionEmissions;
  openEmissionsRates: boolean = false;
  constructor(
    private settingsFormsService: SettingsFormsService,
    private eGridService: EGridService,
    private router: Router,
    private sharedDataService: SharedDataService,
    private injector: Injector
  ) { }

  ngOnInit(): void {
    this.selectedAccountSub = toObservable(this.accountWorkspaceStore.account, { injector: this.injector }).subscribe(account => {
      this.selectedAccount = account;
      if (account && this.inAccount) {
        if (this.isFormChange == false) {
          this.form = this.settingsFormsService.getUnitsForm(account);
          this.form.addControl('assessmentReportVersion', new FormControl(account.assessmentReportVersion))
          this.form.addControl('displayEmissions', new FormControl(account.displayEmissions ? true : false))
          this.checkCurrentZip();
        } else {
          this.isFormChange = false;
        }
      }
    });

    this.selectedFacilitySub = toObservable(this.accountWorkspaceStore.selectedFacility, { injector: this.injector }).subscribe(facility => {
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
    if (this.inAccount) {
      this.selectedAccount = this.settingsFormsService.updateAccountFromUnitsForm(this.form, this.selectedAccount);
      this.selectedAccount.assessmentReportVersion = this.form.controls.assessmentReportVersion.value;
      this.selectedAccount.displayEmissions = this.form.controls.displayEmissions.value;
      await this.commandBoundary.execute(
        { entityKind: 'account', changeKind: 'update', entityGuid: this.selectedAccount.guid, label: 'Saving account' },
        () => this.accountHandler.update({ ...this.selectedAccount }, this.selectedAccount.guid)
      );
      await this.applicationLifecycleService.refreshAccountCatalog();
    }
    if (!this.inAccount) {
      this.selectedFacility = this.settingsFormsService.updateFacilityFromUnitsForm(this.form, this.selectedFacility);
      await this.commandBoundary.execute(
        { entityKind: 'facility', changeKind: 'update', entityGuid: this.selectedFacility.guid, label: 'Saving facility' },
        () => this.facilityHandler.update({ ...this.selectedFacility }, this.accountWorkspaceStore.account()?.guid)
      );
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
    let customSubRegions: Array<IdbCustomEmissionsItem> = [...this.accountWorkspaceStore.customEmissions()];
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
    if (this.router.url.includes('data-management')) {
      let accountId: string;
      if (this.inAccount) {
        accountId = this.selectedAccount.guid;
      } else {
        accountId = this.selectedFacility.accountId;
      }
      this.router.navigateByUrl('data-management/' + accountId + '/account-custom-data/custom-gwps');
    } else {
      this.router.navigateByUrl('/data-evaluation/account/custom-data/emissions')
    }
  }
}
