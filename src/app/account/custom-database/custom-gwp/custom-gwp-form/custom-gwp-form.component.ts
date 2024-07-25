import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { CustomGWPDbService } from 'src/app/indexedDB/custom-gwp-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { GlobalWarmingPotential, GlobalWarmingPotentials } from 'src/app/models/globalWarmingPotentials';
import { IdbCustomGWP, IdbUtilityMeter } from 'src/app/models/idb';
import { IdbAccount } from 'src/app/models/idbModels/account';

@Component({
  selector: 'app-custom-gwp-form',
  templateUrl: './custom-gwp-form.component.html',
  styleUrls: ['./custom-gwp-form.component.css']
})
export class CustomGwpFormComponent {

  isAdd: boolean;
  editCustomGWP: IdbCustomGWP;
  isInvalid: boolean;
  invalidValue: string;
  previousValue: number;
  accountCustomGWPs: Array<IdbCustomGWP>;
  allGWPNames: Array<string>;
  selectedAccount: IdbAccount;
  form: FormGroup;
  displayGWPModal: boolean = false;
  isGWPInUse: boolean = false;

  constructor(private router: Router, private customGWPDbService: CustomGWPDbService,
    private activatedRoute: ActivatedRoute,
    private accountDbService: AccountdbService,
    private formBuilder: FormBuilder,
    private utilityMeterDbService: UtilityMeterdbService) {
  }

  ngOnInit() {
    this.accountCustomGWPs = this.customGWPDbService.accountCustomGWPs.getValue();
    this.setAllGWPNames();
    this.isAdd = this.router.url.includes('add');
    this.selectedAccount = this.accountDbService.selectedAccount.getValue();
    if (this.isAdd) {
      this.editCustomGWP = this.customGWPDbService.getNewAccountCustomGWP(this.selectedAccount);
      this.setForm(this.editCustomGWP);
    } else {
      this.activatedRoute.params.subscribe(params => {
        let elementId: string = params['id'];
        let selectedItem: IdbCustomGWP = this.accountCustomGWPs.find(item => { return item.guid == elementId });
        this.editCustomGWP = JSON.parse(JSON.stringify(selectedItem));
        this.setIsGWPInUse();
        this.setForm(this.editCustomGWP);
        this.previousValue = selectedItem.value;
        this.checkInvalid();
      });
    }
  }

  checkInvalid() {
    this.setValueInvalid();
    this.isInvalid = (this.invalidValue != undefined);
  }

  setValueInvalid() {
    let invalidValue: string = undefined;
    let currentValue: string = this.form.controls.gwpLabel.value;
    if (!currentValue) {
      invalidValue = 'GWP name required.';
    } else {
      let checkExists: string = this.allGWPNames.find(gwpLabel => { return gwpLabel == currentValue });
      if (checkExists && this.isAdd) {
          invalidValue = 'Unique name required for fuel. Current name already exists.';
      }
    }
    this.invalidValue = invalidValue;
  }

  setAllGWPNames() {
    this.allGWPNames = this.accountCustomGWPs.flatMap(gwp => {
      return gwp.label
    });

    GlobalWarmingPotentials.forEach(option => {
      this.allGWPNames.push(option.label)
    });
  }

  async save() {
    this.editCustomGWP.label = this.form.controls.gwpLabel.value;
    this.editCustomGWP.gwp = this.form.controls.gwp.value;
    this.editCustomGWP.display = this.form.controls.gwpLabel.value;

    if (this.isAdd) {
      await firstValueFrom(this.customGWPDbService.addWithObservable(this.editCustomGWP));
    } else {
      if (this.isGWPInUse) {
        //update meters
        let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
        let needsUpdate: boolean = false;
        for (let i = 0; i < accountMeters.length; i++) {
          if (accountMeters[i].globalWarmingPotentialOption == this.previousValue) {
            needsUpdate = true;
            accountMeters[i].globalWarmingPotential = this.editCustomGWP.gwp;
            await firstValueFrom(this.utilityMeterDbService.updateWithObservable(accountMeters[i]));
          }
        }
        let allMeters: Array<IdbUtilityMeter> = await firstValueFrom(this.utilityMeterDbService.getAll());
        let accountMetersUpdates: Array<IdbUtilityMeter> = allMeters.filter(meter => {
          return meter.accountId == this.selectedAccount.guid;
        });
        this.utilityMeterDbService.accountMeters.next(accountMetersUpdates);
      }
      await firstValueFrom(this.customGWPDbService.updateWithObservable(this.editCustomGWP));
    }
    let allCustomGWPs: Array<IdbCustomGWP> = await firstValueFrom(this.customGWPDbService.getAll());
    let accountCustomGWPs: Array<IdbCustomGWP> = allCustomGWPs.filter(gwp => { return gwp.accountId == this.selectedAccount.guid });
    this.customGWPDbService.accountCustomGWPs.next(accountCustomGWPs);
    this.navigateHome();
  }

  navigateHome() {
    this.router.navigateByUrl('/account/custom-data/gwp');
  }

  setForm(editItem: IdbCustomGWP) {
    this.form = this.formBuilder.group({
      'gwpLabel': [editItem.label, [Validators.required]],
      'gwp': [editItem.gwp, [Validators.required]],
    });
  }

  showGWPModal() {
    this.displayGWPModal = true;
  }

  hideGWPModal(selectedOption: GlobalWarmingPotential) {
    this.displayGWPModal = false;
    if (selectedOption) {
      this.form.controls.gwpLabel.patchValue(selectedOption.label + ' (Modified)');
      this.form.controls.gwp.patchValue(selectedOption.gwp);
    }
  }

  setIsGWPInUse() {
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let gwpMeter: IdbUtilityMeter = accountMeters.find(meter => { return meter.globalWarmingPotentialOption == this.editCustomGWP.value });
    this.isGWPInUse = (gwpMeter != undefined);
  }
}
