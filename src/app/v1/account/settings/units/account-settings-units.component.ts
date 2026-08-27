import { Component, computed, effect, inject, untracked } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { IdbAccount } from '@data/models/idbModels/account';
import { EGridService } from '@shared/helper-services/e-grid.service';
import { SettingsFormService } from '@shared/settings-forms/settings-form.service';
import { EnergyUnitOptions, MassUnitOptions, VolumeGasOptions, VolumeLiquidOptions } from '@shared/unitOptions';
import { AccountSettingsDetailBase } from '../account-settings-detail.base';

@Component({
  selector: 'app-account-settings-units',
  templateUrl: './account-settings-units.component.html',
  styleUrls: ['../account-settings.component.css'],
  host: { style: 'display: block;' },
  standalone: false
})
export class AccountSettingsUnitsComponent extends AccountSettingsDetailBase {
  private readonly settingsForms = inject(SettingsFormService);
  private readonly eGridService = inject(EGridService);

  readonly energyUnitOptions = EnergyUnitOptions;
  readonly volumeLiquidOptions = VolumeLiquidOptions;
  readonly volumeGasOptions = VolumeGasOptions;
  readonly massUnitOptions = MassUnitOptions;
  readonly subregionOptions = computed(() => this.getSubregionOptions(this.account()?.zip));
  form: FormGroup;

  constructor() {
    super();
    effect(() => {
      const account = this.account();
      if (!account) {
        return;
      }
      if (this.skipNextWorkspaceRefresh) {
        this.skipNextWorkspaceRefresh = false;
        return;
      }
      this.buildForm(account);
    });
    effect(() => {
      this.applyFormAvailability(this.canWrite());
    });
  }

  async setUnitsOfMeasure(): Promise<void> {
    this.form = this.settingsForms.setUnitsOfMeasure(this.form);
    this.ensureSelectedSubregion();
    this.applyFormAvailability(this.canWrite());
    await this.saveUnits();
  }

  async saveUnits(): Promise<void> {
    if (!this.form) {
      return;
    }
    this.form = this.settingsForms.checkCustom(this.form);
    this.ensureSelectedSubregion();
    this.applyFormAvailability(this.canWrite());
    await this.saveAccount('Saving unit settings', account =>
      this.settingsForms.updateAccountFromUnitsForm(this.form, account)
    );
  }

  private buildForm(account: IdbAccount): void {
    this.form = this.settingsForms.getUnitsForm(account);
    this.ensureSelectedSubregion();
    this.applyFormAvailability(untracked(() => this.canWrite()));
  }

  private getSubregionOptions(zip: string | undefined): string[] {
    const options = ['US Average'];
    if (zip && zip.length === 5) {
      const match = this.eGridService.subRegionsByZipcode.find(item => String(item.zip) === zip);
      match?.subregions.filter(Boolean).forEach(subregion => options.unshift(subregion));
    }
    this.workspace.customEmissions().forEach(item => options.push(item.subregion));
    return [...new Set(options)];
  }

  private ensureSelectedSubregion(): void {
    if (!this.form) {
      return;
    }
    const current = this.form.controls['eGridSubregion'].value;
    if (!current || !this.subregionOptions().includes(current)) {
      this.form.controls['eGridSubregion'].patchValue(this.subregionOptions()[0], { emitEvent: false });
    }
  }

  private applyFormAvailability(canWrite: boolean): void {
    this.setFormEnabled(this.form, canWrite);
  }
}
