import { TemplatePortal } from '@angular/cdk/portal';
import { Component, TemplateRef, ViewChild, ViewContainerRef, computed, effect, inject, untracked } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { IdbFacility } from '@data/models/idbModels/facility';
import { SettingsFormService } from '@shared/settings-forms/settings-form.service';
import { ModalPortalService } from '../../../shell/modal-portal.service';
import { FacilitySettingsDetailBase } from '../facility-settings-detail.base';

@Component({
  selector: 'app-facility-settings-goals',
  templateUrl: './facility-settings-goals.component.html',
  host: { style: 'display: block;' },
  standalone: false
})
export class FacilitySettingsGoalsComponent extends FacilitySettingsDetailBase {
  private readonly settingsForms = inject(SettingsFormService);
  private readonly modalPortal = inject(ModalPortalService);
  private readonly viewContainerRef = inject(ViewContainerRef);

  readonly years = Array.from({ length: 50 }, (_, index) => 2050 - index);
  readonly goalsDiffer = computed(() => {
    const account = this.account();
    const facility = this.facility();
    return !!account && !!facility && this.settingsForms.areAccountAndFacilitySustainabilityQuestionsDifferent(account, facility);
  });
  readonly displayGreenhouseGoals = computed(() => !!this.account()?.displayEmissions);
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

  scheduleGoalsSave(): void {
    this.scheduleSave(() => this.saveGoals());
  }

  flushGoalsSave(): void {
    this.flushSave(() => this.saveGoals());
  }

  async saveGoals(): Promise<void> {
    if (!this.form) {
      return;
    }
    this.applyFormAvailability(this.canWrite());
    await this.saveFacility(
      'Saving facility goals',
      facility => this.settingsForms.updateFacilityFromSustainabilityQuestionsForm(this.form, facility),
      account => this.settingsForms.updateAccountFromSustainabilityQuestionsForm(this.form, account)
    );
  }

  async changeBaselineYear(baselineControl: string, targetControl: string): Promise<void> {
    const baseline = Number(this.form.controls[baselineControl].value);
    this.form.controls[targetControl].patchValue(Math.min(baseline + 10, 2050));
    await this.saveGoals();
  }

  openAccountUpdateConfirm(): void {
    if (!this.account() || !this.facility() || !this.goalsDiffer() || !this.canWrite()) {
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
    this.settingsForms.setAccountSustainabilityQuestions(this.form, account);
    this.applyFormAvailability(this.canWrite());
    await this.saveGoals();
  }

  private buildForm(facility: IdbFacility): void {
    this.form = this.settingsForms.getFacilitySustainabilityQuestionsForm(facility);
    this.applyFormAvailability(untracked(() => this.canWrite()));
  }

  private applyFormAvailability(canWrite: boolean): void {
    this.setFormEnabled(this.form, canWrite);
    this.setGoalControlsEnabled('energy', canWrite && !!this.form?.controls['energyReductionGoal'].value);
    this.setGoalControlsEnabled('water', canWrite && !!this.form?.controls['waterReductionGoal'].value);
    this.setGoalControlsEnabled(
      'greenhouse',
      canWrite && this.displayGreenhouseGoals() && !!this.form?.controls['greenhouseReductionGoal'].value
    );
  }

  private setGoalControlsEnabled(goal: 'energy' | 'water' | 'greenhouse', enabled: boolean): void {
    this.setControlsEnabled(this.form, [
      `${goal}ReductionPercent`,
      `${goal}ReductionBaselineYear`,
      `${goal}ReductionTargetYear`,
      `${goal}IsAbsolute`
    ], enabled);
  }
}
