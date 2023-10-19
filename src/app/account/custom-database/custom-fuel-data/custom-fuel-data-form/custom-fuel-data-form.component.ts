import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GasOptions, LiquidOptions, OtherEnergyOptions, SolidOptions } from 'src/app/facility/utility-data/energy-consumption/energy-source/edit-meter-form/editMeterOptions';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { CustomFuelDbService } from 'src/app/indexedDB/custom-fuel-db.service';
import { IdbAccount, IdbCustomFuel } from 'src/app/models/idb';

@Component({
  selector: 'app-custom-fuel-data-form',
  templateUrl: './custom-fuel-data-form.component.html',
  styleUrls: ['./custom-fuel-data-form.component.css']
})
export class CustomFuelDataFormComponent {

  isAdd: boolean;
  editCustomFuel: IdbCustomFuel;
  isInvalid: boolean;
  invalidValue: string;
  previousValue: string;
  accountCustomFuels: Array<IdbCustomFuel>;
  allFuelNames: Array<string>;
  constructor(private router: Router, private customFuelDbService: CustomFuelDbService,
    private activatedRoute: ActivatedRoute,
    private accountDbService: AccountdbService) {

  }

  ngOnInit() {
    this.accountCustomFuels = this.customFuelDbService.accountCustomFuels.getValue();
    this.setAllFuelNames();
    this.isAdd = this.router.url.includes('add');
    if (this.isAdd) {
      let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
      this.editCustomFuel = this.customFuelDbService.getNewAccountCustomFuel(selectedAccount);
    } else {
      this.activatedRoute.params.subscribe(params => {
        let elementId: string = params['id'];
        let selectedItem: IdbCustomFuel = this.accountCustomFuels.find(item => { return item.guid == elementId });
        this.editCustomFuel = JSON.parse(JSON.stringify(selectedItem));
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
    if (!this.editCustomFuel.value) {
      invalidValue = 'Fuel name required.';
    } else {
      let checkExists: string = this.allFuelNames.find(fuelName => { return fuelName == this.editCustomFuel.value });
      if (checkExists) {
        if (this.isAdd || (this.previousValue != checkExists)) {
          invalidValue = 'Unique name required for fuel. Current name already exists.';
        }
      }
    }
    this.invalidValue = invalidValue;
  }

  setAllFuelNames() {
    this.allFuelNames = this.accountCustomFuels.flatMap(fuel => {
      return fuel.value;
    });

    LiquidOptions.forEach(option => {
      this.allFuelNames.push(option.value)
    });
    GasOptions.forEach(option => {
      this.allFuelNames.push(option.value);
    });
    SolidOptions.forEach(option => {
      this.allFuelNames.push(option.value);
    });
    OtherEnergyOptions.forEach(option => {
      this.allFuelNames.push(option.value);
    });
  }

  save() {

  }

  navigateHome() {
    this.router.navigateByUrl('/account/custom-data/fuels');
  }

}
