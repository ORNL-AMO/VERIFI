import { Component, DestroyRef, EventEmitter, HostListener, Input, OnInit, Output, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { GlobalWarmingPotential } from '@data/models/globalWarmingPotentials';
import { AssessmentReportVersion } from '@data/models/idbModels/account';
import { IdbCustomGWP } from '@data/models/idbModels/customGWP';
import { applyStandardGwp, globalWarmingPotentialValue, hasDifferentAssessmentValues } from '../custom-gwp.models';
import { CustomGwpImpact, CustomGwpService } from '../custom-gwp.service';

@Component({
  selector: 'app-custom-gwp-form',
  templateUrl: './custom-gwp-form.component.html',
  styleUrls: ['./custom-gwp-form.component.css'],
  standalone: false
})
export class CustomGwpFormComponent implements OnInit {
  @Input() gwp?: IdbCustomGWP;
  @Input() impact?: CustomGwpImpact;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<IdbCustomGWP>();
  @Output() dirtyChange = new EventEmitter<boolean>();
  @Output() savingChange = new EventEmitter<boolean>();

  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly customGwps = inject(CustomGwpService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  form!: FormGroup;
  draft!: IdbCustomGWP;
  assessmentReportVersion: AssessmentReportVersion = 'AR6';
  normalizesAssessmentValues = false;
  pickerOpen = false;
  isSaving = false;
  saveError = '';

  get isAdd(): boolean {
    return !this.gwp;
  }

  get canSave(): boolean {
    return !!this.form && this.form.valid && !this.isSaving;
  }

  ngOnInit(): void {
    const account = this.workspace.account();
    if (!account) throw new Error('An active account is required to edit a custom GWP.');
    this.assessmentReportVersion = account.assessmentReportVersion ?? 'AR6';
    this.draft = structuredClone(this.gwp ?? this.customGwps.newGwp());
    this.normalizesAssessmentValues = !!this.gwp && hasDifferentAssessmentValues(this.gwp);
    this.form = this.formBuilder.group({
      label: [this.draft.label, [Validators.required, this.uniqueNameValidator(this.draft.guid)]],
      value: [globalWarmingPotentialValue(this.draft, this.assessmentReportVersion), [Validators.required, Validators.min(0)]]
    });
    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.dirtyChange.emit(this.form.dirty));
  }

  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(event: BeforeUnloadEvent): void {
    if (this.form?.dirty) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  requestClose(): void {
    if (!this.isSaving) this.closed.emit();
  }

  openPicker(): void {
    if (!this.isSaving) this.pickerOpen = true;
  }

  closePicker(): void {
    this.pickerOpen = false;
  }

  selectStandardGwp(option: GlobalWarmingPotential): void {
    this.draft = applyStandardGwp(this.draft, option, this.assessmentReportVersion);
    this.form.patchValue({
      label: this.draft.label,
      value: globalWarmingPotentialValue(this.draft, this.assessmentReportVersion)
    });
    this.form.markAsDirty();
    this.dirtyChange.emit(true);
    this.pickerOpen = false;
  }

  fieldInvalid(name: string): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.dirty || control.touched);
  }

  async save(): Promise<void> {
    this.saveError = '';
    this.form.markAllAsTouched();
    if (!this.canSave) return;
    this.isSaving = true;
    this.savingChange.emit(true);
    try {
      const gwp = this.buildGwp();
      const saved = this.isAdd ? await this.customGwps.create(gwp) : await this.customGwps.update(gwp);
      this.form.markAsPristine();
      this.dirtyChange.emit(false);
      this.saved.emit(saved);
    } catch (error) {
      console.warn('v1 custom GWP save failed.', error);
      this.saveError = 'The global warming potential could not be saved. Review the form and try again.';
    } finally {
      this.isSaving = false;
      this.savingChange.emit(false);
    }
  }

  private buildGwp(): IdbCustomGWP {
    const label = String(this.form.controls['label'].value).trim();
    const value = Number(this.form.controls['value'].value);
    return {
      ...this.draft,
      label,
      display: label,
      gwp_ar4: value,
      gwp_ar5: value,
      gwp_ar6: value
    };
  }

  private uniqueNameValidator(currentGuid?: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = String(control.value || '').trim();
      if (!value) return null;
      return this.customGwps.isNameAvailable(value, currentGuid) ? null : { duplicateGwpName: true };
    };
  }
}
