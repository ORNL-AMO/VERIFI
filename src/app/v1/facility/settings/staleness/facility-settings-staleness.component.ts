import { TemplatePortal } from '@angular/cdk/portal';
import { Component, TemplateRef, ViewChild, ViewContainerRef, computed, effect, inject, untracked } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { DATA_STALENESS_OPTIONS } from '@domain/calculations/status-check-calculations/statusCheckModels';
import { IdbFacility } from '@data/models/idbModels/facility';
import { SettingsFormService } from '@shared/settings-forms/settings-form.service';
import { ModalPortalService } from '../../../shell/modal-portal.service';
import { FacilitySettingsDetailBase } from '../facility-settings-detail.base';

@Component({
  selector: 'app-facility-settings-staleness',
  templateUrl: './facility-settings-staleness.component.html',
  host: { style: 'display: block;' },
  standalone: false
})
export class FacilitySettingsStalenessComponent extends FacilitySettingsDetailBase {
  private readonly settingsForms = inject(SettingsFormService);
  private readonly modalPortal = inject(ModalPortalService);
  private readonly viewContainerRef = inject(ViewContainerRef);

  readonly stalenessOptions = DATA_STALENESS_OPTIONS;
  readonly stalenessDiffer = computed(() => {
    const account = this.account();
    const facility = this.facility();
    return !!account && !!facility && this.settingsForms.areAccountAndFacilityStalenessDifferent(account, facility);
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

  get isUsingAccountStaleness(): boolean {
    return this.form?.controls['useAccountSettings']?.value === true;
  }

  async saveStaleness(): Promise<void> {
    if (!this.form) {
      return;
    }
    this.applyFormAvailability(this.canWrite());
    await this.saveFacility(
      'Saving facility staleness settings',
      facility => this.settingsForms.updateFacilityFromStalenessForm(this.form, facility),
      account => this.settingsForms.updateAccountFromStalenessForm(this.form, account)
    );
  }

  async onUseAccountStalenessChange(): Promise<void> {
    const account = this.account();
    if (account && this.form.controls['useAccountSettings'].value) {
      this.settingsForms.setAccountStaleness(this.form, account);
    }
    this.applyFormAvailability(this.canWrite());
    await this.saveStaleness();
  }

  openAccountUpdateConfirm(): void {
    if (!this.account() || !this.facility() || !this.stalenessDiffer() || !this.canWrite()) {
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
    this.settingsForms.setAccountStaleness(this.form, account);
    this.applyFormAvailability(this.canWrite());
    await this.saveStaleness();
  }

  private buildForm(facility: IdbFacility): void {
    this.form = this.settingsForms.getFacilityStalenessForm(facility.dataStalenessSettings, this.account()?.dataStalenessSettings);
    this.applyFormAvailability(untracked(() => this.canWrite()));
  }

  private applyFormAvailability(canWrite: boolean): void {
    this.setFormEnabled(this.form, canWrite);
    this.setControlsEnabled(
      this.form,
      ['enabled', 'thresholdMonths'],
      canWrite && !this.isUsingAccountStaleness
    );
    this.setControlEnabled(
      this.form?.controls['thresholdMonths'],
      canWrite && !this.isUsingAccountStaleness && !!this.form?.controls['enabled'].value
    );
  }
}
