import { Component, Input, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbAccount, IdbFacility } from 'src/app/models/idb';
import { EnergyUnitOptions, MassUnitOptions, SizeUnitOptions, UnitOption, VolumeGasOptions, VolumeLiquidOptions } from 'src/app/shared/unitOptions';
import { AccountManagementService } from '../account-management.service';

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
  sizeUnitOptions: Array<UnitOption> = SizeUnitOptions;
  massUnitOptions: Array<UnitOption> = MassUnitOptions;

  selectedFacilitySub: Subscription;
  selectedAccountSub: Subscription;
  selectedAccount: IdbAccount;
  selectedFacility: IdbFacility;
  unitsDontMatchAccount: boolean = false;

  constructor(private accountDbService: AccountdbService, private accountManagementService: AccountManagementService, private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.selectedAccountSub = this.accountDbService.selectedAccount.subscribe(account => {
      this.selectedAccount = account;
      if (account && this.inAccount) {
        this.form = this.accountManagementService.getUnitsForm(account);
      }
    });

    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(facility => {
      this.selectedFacility = facility;
      if (facility && !this.inAccount) {
        this.checkUnitsDontMatch();
        this.form = this.accountManagementService.getUnitsForm(facility);
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
}
