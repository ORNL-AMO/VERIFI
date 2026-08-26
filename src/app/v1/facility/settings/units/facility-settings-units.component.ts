import { TemplatePortal } from '@angular/cdk/portal';
import { Component, TemplateRef, ViewChild, ViewContainerRef, computed, effect, inject, untracked } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { IdbFacility } from '@data/models/idbModels/facility';
import { EGridService } from '@shared/helper-services/e-grid.service';
import { SettingsFormService } from '@shared/settings-forms/settings-form.service';
import { EnergyUnitOptions, MassUnitOptions, VolumeGasOptions, VolumeLiquidOptions } from '@shared/unitOptions';
import { ModalPortalService } from '../../../shell/modal-portal.service';
import { FacilitySettingsDetailBase } from '../facility-settings-detail.base';

@Component({
  selector: 'app-facility-settings-units',
  templateUrl: './facility-settings-units.component.html',
  host: { style: 'display: block;' },
  standalone: false
})
export class FacilitySettingsUnitsComponent extends FacilitySettingsDetailBase {
  private readonly settingsForms = inject(SettingsFormService);
  private readonly eGridService = inject(EGridService);
  private readonly modalPortal = inject(ModalPortalService);
  private readonly viewContainerRef = inject(ViewContainerRef);

  readonly energyUnitOptions = EnergyUnitOptions;
  readonly volumeLiquidOptions = VolumeLiquidOptions;
  readonly volumeGasOptions = VolumeGasOptions;
  readonly massUnitOptions = MassUnitOptions;
  readonly subregionOptions = computed(() => this.getSubregionOptions(this.facility()?.zip));
  readonly unitsDiffer = computed(() => {
    const account = this.account();
    const facility = this.facility();
    return !!account && !!facility && this.settingsForms.areAccountAndFacilityUnitsDifferent(account, facility);
  });
  form: FormGroup;
  showAccountUpdateConfirm = false;

  @ViewChild('accountUpdateConfirmModal') private readonly accountUpdateConfirmModal!: TemplateRef<unknown>;

  constructor() {
    super();
    effect(() => {
      const facility = this.facility();
      if (!facility) {
        return;
      }
      if (this.skipNextWorkspaceRefresh) {
        this.skipNextWorkspaceRefresh = false;
        return;
      }
      this.buildForm(facility);
    });
    effect(() => {
      this.applyFormAvailability(this.canWrite());
    });
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy();
    this.modalPortal.hide();
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
    await this.saveFacility(
      'Saving facility units',
      facility => this.settingsForms.updateFacilityFromUnitsForm(this.form, facility),
      account => this.settingsForms.updateAccountFromUnitsForm(this.form, account)
    );
  }

  openAccountUpdateConfirm(): void {
    if (!this.account() || !this.facility() || !this.unitsDiffer() || !this.canWrite()) {
      return;
    }
    this.showAccountUpdateConfirm = true;
    this.saveError = '';
    this.modalPortal.show(new TemplatePortal(this.accountUpdateConfirmModal, this.viewContainerRef));
  }

  cancelAccountUpdateConfirm(): void {
    this.showAccountUpdateConfirm = false;
    this.modalPortal.hide();
  }

  async confirmAccountSettingsUpdate(): Promise<void> {
    const account = this.account();
    if (!account || !this.form) {
      return;
    }
    this.showAccountUpdateConfirm = false;
    this.modalPortal.hide();
    this.settingsForms.setAccountUnits(this.form, account);
    this.ensureSelectedSubregion();
    this.applyFormAvailability(this.canWrite());
    await this.saveUnits();
  }

  private buildForm(facility: IdbFacility): void {
    this.form = this.settingsForms.getUnitsForm(facility);
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
