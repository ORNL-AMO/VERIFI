import { TemplatePortal } from '@angular/cdk/portal';
import { Component, TemplateRef, ViewChild, ViewContainerRef, computed, effect, inject, untracked } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { IdbFacility } from '@data/models/idbModels/facility';
import { Months } from '@shared/form-data/months';
import { SettingsFormService } from '@shared/settings-forms/settings-form.service';
import { ModalPortalService } from '../../../shell/modal-portal.service';
import { FacilitySettingsDetailBase } from '../facility-settings-detail.base';

@Component({
  selector: 'app-facility-settings-financial',
  templateUrl: './facility-settings-financial.component.html',
  host: { style: 'display: block;' },
  standalone: false
})
export class FacilitySettingsFinancialComponent extends FacilitySettingsDetailBase {
  private readonly settingsForms = inject(SettingsFormService);
  private readonly modalPortal = inject(ModalPortalService);
  private readonly viewContainerRef = inject(ViewContainerRef);

  readonly months = Months;
  readonly financialDiffer = computed(() => {
    const account = this.account();
    const facility = this.facility();
    return !!account && !!facility && this.settingsForms.areAccountAndFacilityFinancialReportingDifferent(account, facility);
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

  async saveFinancial(): Promise<void> {
    if (!this.form) {
      return;
    }
    this.applyFormAvailability(this.canWrite());
    await this.saveFacility(
      'Saving facility financial reporting',
      facility => this.settingsForms.updateFacilityFromFiscalForm(this.form, facility),
      account => this.settingsForms.updateAccountFromFiscalForm(this.form, account)
    );
  }

  openAccountUpdateConfirm(): void {
    if (!this.account() || !this.facility() || !this.financialDiffer() || !this.canWrite()) {
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
    this.settingsForms.setAccountFinancialReporting(this.form, account);
    this.applyFormAvailability(this.canWrite());
    await this.saveFinancial();
  }

  private buildForm(facility: IdbFacility): void {
    this.form = this.settingsForms.getFiscalYearForm(facility);
    this.applyFormAvailability(untracked(() => this.canWrite()));
  }

  private applyFormAvailability(canWrite: boolean): void {
    this.setFormEnabled(this.form, canWrite);
    this.setControlsEnabled(
      this.form,
      ['fiscalYearMonth', 'fiscalYearCalendarEnd'],
      canWrite && this.form?.controls['fiscalYear'].value === 'nonCalendarYear'
    );
  }
}
