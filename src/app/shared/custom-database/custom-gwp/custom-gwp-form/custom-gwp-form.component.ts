import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { WorkspaceCommandBoundary } from 'src/app/account-workspace/workspace-command-boundary.service';
import { CustomDataCommandHandler } from 'src/app/account-workspace/handlers/custom-data-command-handler.service';
import { GlobalWarmingPotential, GlobalWarmingPotentials } from 'src/app/models/globalWarmingPotentials';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { getNewAccountCustomGWP, IdbCustomGWP } from 'src/app/models/idbModels/customGWP';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';

@Component({
    selector: 'app-custom-gwp-form',
    templateUrl: './custom-gwp-form.component.html',
    styleUrls: ['./custom-gwp-form.component.css'],
    standalone: false
})
export class CustomGwpFormComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private readonly commandBoundary = inject(WorkspaceCommandBoundary);
  private readonly customDataHandler = inject(CustomDataCommandHandler);

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

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private formBuilder: FormBuilder
  ) {
  }

  ngOnInit() {
    this.accountCustomGWPs = [...this.accountWorkspaceStore.customGWPs()];
    this.setAllGWPNames();
    this.isAdd = this.router.url.includes('add');
    this.selectedAccount = this.accountWorkspaceStore.account();
    if (this.isAdd) {
      this.editCustomGWP = getNewAccountCustomGWP(this.selectedAccount);
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
    this.editCustomGWP.gwp_ar4 = this.form.controls.gwp.value;
    this.editCustomGWP.gwp_ar5 = this.form.controls.gwp.value;
    this.editCustomGWP.gwp_ar6 = this.form.controls.gwp.value;
    this.editCustomGWP.display = this.form.controls.gwpLabel.value;
    const activeAccountGuid = this.accountWorkspaceStore.account()?.guid;

    if (this.isAdd) {
      await this.commandBoundary.execute(
        { entityKind: 'customGWP', changeKind: 'add', label: 'Adding custom GWP' },
        () => this.customDataHandler.addCustomGWP(this.editCustomGWP, activeAccountGuid)
      );
    } else {
      await this.commandBoundary.execute(
        { entityKind: 'customGWP', changeKind: 'update', entityGuid: this.editCustomGWP.guid, label: 'Saving custom GWP' },
        () => this.customDataHandler.updateCustomGWP(this.editCustomGWP, activeAccountGuid)
      );
    }
    this.navigateHome();
  }

  navigateHome() {
    if (this.isAdd) {
      this.router.navigate(['../'], { relativeTo: this.activatedRoute });
    } else {
      this.router.navigate(['../../'], { relativeTo: this.activatedRoute });
    }
  }

  setForm(editItem: IdbCustomGWP) {
    this.form = this.formBuilder.group({
      'gwpLabel': [editItem.label, [Validators.required]],
      'gwp': [editItem.gwp_ar4, [Validators.required]],
    });
  }

  showGWPModal() {
    this.displayGWPModal = true;
  }

  hideGWPModal(selectedOption: GlobalWarmingPotential) {
    this.displayGWPModal = false;
    if (selectedOption) {
      this.form.controls.gwpLabel.patchValue(selectedOption.label + ' (Modified)');
      this.form.controls.gwp_ar4.patchValue(selectedOption.gwp_ar4);
    }
  }

  setIsGWPInUse() {
    let accountMeters: Array<IdbUtilityMeter> = [...this.accountWorkspaceStore.meters()];
    let gwpMeter: IdbUtilityMeter = accountMeters.find(meter => { return meter.globalWarmingPotentialOption == this.editCustomGWP.value });
    this.isGWPInUse = (gwpMeter != undefined);
  }
}
