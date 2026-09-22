import { Component, DestroyRef, EventEmitter, HostListener, Input, OnInit, Output, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { MeterPhase } from '@data/models/constantsAndTypes';
import { IdbAccount } from '@data/models/idbModels/account';
import { IdbCustomFuel } from '@data/models/idbModels/customFuel';
import { CustomFuelImpact, CustomFuelService } from '../custom-fuel.service';
import {
  StandardFuelSelection,
  applyStandardFuel,
  calculatedOutputRate,
  displayEmissionsRate,
  standardFuelNames,
  startingUnitFor,
  storedEmissionsRate
} from '../custom-fuel.models';

@Component({
  selector: 'app-custom-fuel-form',
  templateUrl: './custom-fuel-form.component.html',
  styleUrls: ['./custom-fuel-form.component.css'],
  standalone: false
})
export class CustomFuelFormComponent implements OnInit {
  @Input() fuel?: IdbCustomFuel;
  @Input() impact?: CustomFuelImpact;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<IdbCustomFuel>();
  @Output() dirtyChange = new EventEmitter<boolean>();
  @Output() savingChange = new EventEmitter<boolean>();

  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly customFuels = inject(CustomFuelService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  form!: FormGroup;
  draft!: IdbCustomFuel;
  account!: IdbAccount;
  isSaving = false;
  saveError = '';
  pickerOpen = false;
  previousName = '';

  get isAdd(): boolean {
    return !this.fuel;
  }

  get isMobile(): boolean {
    return this.form?.controls['isMobile'].value === true;
  }

  get directRate(): boolean {
    return this.form?.controls['directEmissionsRate'].value === true;
  }

  get canSave(): boolean {
    return !!this.form && this.form.valid && !this.isSaving;
  }

  get startingUnit(): string {
    return startingUnitFor(this.account, this.form.controls['phase'].value as MeterPhase);
  }

  ngOnInit(): void {
    const account = this.workspace.account();
    if (!account) {
      throw new Error('An active account is required to edit a custom fuel.');
    }
    this.account = account;
    this.draft = structuredClone(this.fuel ?? this.customFuels.newFuel());
    this.previousName = this.draft.value || '';
    this.form = this.buildForm(this.draft);
    this.updateConditionalValidators(false);
    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.dirtyChange.emit(this.form.dirty));
  }

  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  hasUnsavedChanges(): boolean {
    return !!this.form?.dirty;
  }

  requestClose(): void {
    if (!this.isSaving) {
      this.closed.emit();
    }
  }

  openPicker(): void {
    if (!this.isSaving) {
      this.pickerOpen = true;
    }
  }

  closePicker(): void {
    this.pickerOpen = false;
  }

  selectStandardFuel(selection: StandardFuelSelection): void {
    this.draft = applyStandardFuel(this.draft, selection, this.account);
    this.resetFormValues(this.draft);
    this.form.markAsDirty();
    this.dirtyChange.emit(true);
    this.pickerOpen = false;
  }

  onMobileChanged(): void {
    if (this.isMobile) {
      this.form.patchValue({
        phase: 'Liquid',
        heatCapacityValue: 1,
        siteToSourceMultiplier: 1,
        directEmissionsRate: false
      });
    }
    this.updateConditionalValidators();
    this.recalculateOutputRate();
  }

  onDirectRateChanged(): void {
    if (this.directRate) {
      this.form.patchValue({ CO2: 0, CH4: 0, N2O: 0 });
    }
    this.updateConditionalValidators();
    this.recalculateOutputRate();
  }

  recalculateOutputRate(): void {
    if (this.directRate || this.isMobile) return;
    const CO2 = Number(this.form.controls['CO2'].value);
    const CH4 = Number(this.form.controls['CH4'].value);
    const N2O = Number(this.form.controls['N2O'].value);
    if ([CO2, CH4, N2O].every(Number.isFinite)) {
      this.form.controls['emissionsOutputRate'].setValue(calculatedOutputRate(CO2, CH4, N2O), { emitEvent: false });
    }
  }

  async save(): Promise<void> {
    this.saveError = '';
    this.form.markAllAsTouched();
    if (this.form.invalid || this.isSaving) return;

    this.isSaving = true;
    this.savingChange.emit(true);
    try {
      const fuel = this.buildFuel();
      const saved = this.isAdd
        ? await this.customFuels.create(fuel)
        : await this.customFuels.update(fuel, this.previousName);
      this.form.markAsPristine();
      this.dirtyChange.emit(false);
      this.savingChange.emit(false);
      this.saved.emit(saved);
    } catch (error) {
      console.warn('v1 custom fuel save failed.', error);
      this.saveError = 'The custom fuel could not be saved. Review the form and try again.';
      this.isSaving = false;
      this.savingChange.emit(false);
    }
  }

  fieldInvalid(name: string): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || control.dirty);
  }

  private buildForm(fuel: IdbCustomFuel): FormGroup {
    const mobile = fuel.isMobile === true;
    return this.formBuilder.group({
      fuelName: [fuel.value, [Validators.required, this.uniqueNameValidator(fuel.guid)]],
      isMobile: [mobile, Validators.required],
      isOnRoad: [fuel.isOnRoad ?? false, Validators.required],
      phase: [fuel.phase ?? 'Gas', Validators.required],
      heatCapacityValue: [fuel.heatCapacityValue, Validators.required],
      siteToSourceMultiplier: [fuel.siteToSourceMultiplier, Validators.required],
      isBiofuel: [fuel.isBiofuel ?? false, Validators.required],
      directEmissionsRate: [fuel.directEmissionsRate ?? false],
      CO2: [this.displayRate(fuel.CO2, mobile)],
      CH4: [this.displayRate(fuel.CH4, mobile)],
      N2O: [this.displayRate(fuel.N2O, mobile)],
      emissionsOutputRate: [this.displayRate(fuel.emissionsOutputRate, mobile)]
    });
  }

  private resetFormValues(fuel: IdbCustomFuel): void {
    const mobile = fuel.isMobile === true;
    this.form.reset({
      fuelName: fuel.value,
      isMobile: mobile,
      isOnRoad: fuel.isOnRoad ?? false,
      phase: fuel.phase,
      heatCapacityValue: fuel.heatCapacityValue,
      siteToSourceMultiplier: fuel.siteToSourceMultiplier,
      isBiofuel: fuel.isBiofuel ?? false,
      directEmissionsRate: fuel.directEmissionsRate ?? false,
      CO2: this.displayRate(fuel.CO2, mobile),
      CH4: this.displayRate(fuel.CH4, mobile),
      N2O: this.displayRate(fuel.N2O, mobile),
      emissionsOutputRate: this.displayRate(fuel.emissionsOutputRate, mobile)
    });
    this.updateConditionalValidators(false);
  }

  private buildFuel(): IdbCustomFuel {
    const values = this.form.getRawValue();
    const mobile = values.isMobile === true;
    const normalize = (value: number | undefined) => mobile ? value : storedEmissionsRate(value, this.account.energyUnit);
    return {
      ...this.draft,
      value: String(values.fuelName).trim(),
      isMobile: mobile,
      isOnRoad: mobile ? values.isOnRoad === true : false,
      phase: mobile ? 'Liquid' : values.phase,
      startingUnit: startingUnitFor(this.account, mobile ? 'Liquid' : values.phase),
      heatCapacityValue: values.heatCapacityValue,
      siteToSourceMultiplier: mobile ? 1 : values.siteToSourceMultiplier,
      isBiofuel: values.isBiofuel === true,
      directEmissionsRate: mobile ? false : values.directEmissionsRate === true,
      CO2: normalize(values.CO2),
      CH4: normalize(values.CH4),
      N2O: normalize(values.N2O),
      emissionsOutputRate: normalize(values.emissionsOutputRate)
    };
  }

  private updateConditionalValidators(emitEvent = true): void {
    const stationaryValidators = this.isMobile ? [] : [Validators.required];
    this.setValidators('phase', stationaryValidators, emitEvent);
    this.setValidators('heatCapacityValue', stationaryValidators, emitEvent);
    this.setValidators('siteToSourceMultiplier', stationaryValidators, emitEvent);

    const factorValidators = this.directRate ? [] : [Validators.required];
    this.setValidators('CO2', factorValidators, emitEvent);
    this.setValidators('CH4', factorValidators, emitEvent);
    this.setValidators('N2O', factorValidators, emitEvent);
    this.setValidators('emissionsOutputRate', this.isMobile || this.directRate ? (this.isMobile ? [] : [Validators.required]) : [], emitEvent);
  }

  private setValidators(name: string, validators: ValidatorFn[], emitEvent: boolean): void {
    const control = this.form.controls[name];
    control.setValidators(validators);
    control.updateValueAndValidity({ emitEvent });
  }

  private displayRate(value: number | undefined, mobile: boolean): number | undefined {
    return mobile ? value : displayEmissionsRate(value, this.account.energyUnit);
  }

  private uniqueNameValidator(currentGuid: string): ValidatorFn {
    const reservedNames = new Set([
      ...standardFuelNames(),
      ...this.workspace.customFuels().filter(fuel => fuel.guid !== currentGuid).map(fuel => fuel.value)
    ]);
    return (control: AbstractControl): ValidationErrors | null => {
      const name = String(control.value || '').trim();
      return name && reservedNames.has(name) ? { duplicateFuelName: true } : null;
    };
  }
}
