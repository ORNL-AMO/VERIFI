import { Component, DestroyRef, EventEmitter, HostListener, Input, OnInit, Output, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { EmissionsRate } from '@data/models/eGridEmissions';
import { IdbCustomEmissionsItem } from '@data/models/idbModels/customEmissions';
import { CustomGridFactorImpact, CustomGridFactorService } from '../custom-grid-factor.service';
import { calculateGridFactorOutputRate, gridFactorYears, sortedGridFactorRates } from '../custom-grid-factor.models';

@Component({
  selector: 'app-custom-grid-factor-form',
  templateUrl: './custom-grid-factor-form.component.html',
  styleUrls: ['./custom-grid-factor-form.component.css'],
  standalone: false
})
export class CustomGridFactorFormComponent implements OnInit {
  @Input() gridFactor?: IdbCustomEmissionsItem;
  @Input() impact?: CustomGridFactorImpact;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<IdbCustomEmissionsItem>();
  @Output() dirtyChange = new EventEmitter<boolean>();
  @Output() savingChange = new EventEmitter<boolean>();

  private readonly gridFactors = inject(CustomGridFactorService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly years = gridFactorYears();
  form!: FormGroup;
  draft!: IdbCustomEmissionsItem;
  previousSubregion = '';
  isSaving = false;
  saveError = '';

  get isAdd(): boolean {
    return !this.gridFactor;
  }

  get directRate(): boolean {
    return this.form?.controls['directEmissionsRate'].value === true;
  }

  get locationRates(): FormArray {
    return this.form.controls['locationEmissionRates'] as FormArray;
  }

  get residualRates(): FormArray {
    return this.form.controls['residualEmissionRates'] as FormArray;
  }

  get canSave(): boolean {
    return !!this.form && this.form.valid && !this.isSaving;
  }

  ngOnInit(): void {
    this.draft = structuredClone(this.gridFactor ?? this.gridFactors.newGridFactor());
    this.previousSubregion = this.draft.subregion || '';
    this.form = this.buildForm(this.draft);
    this.updateRateValidators(false);
    this.recalculateAll();
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

  onMethodChanged(): void {
    this.updateRateValidators();
    this.recalculateAll();
  }

  addRate(kind: 'location' | 'residual'): void {
    this.rateArray(kind).push(this.buildRateGroup({} as EmissionsRate));
    this.updateRateValidators();
    this.form.markAsDirty();
    this.dirtyChange.emit(true);
  }

  removeRate(kind: 'location' | 'residual', index: number): void {
    const rates = this.rateArray(kind);
    if (rates.length <= 1 || this.isSaving) return;
    rates.removeAt(index);
    rates.updateValueAndValidity();
    this.form.markAsDirty();
    this.dirtyChange.emit(true);
  }

  recalculateRate(kind: 'location' | 'residual', index: number): void {
    if (this.directRate) return;
    const row = this.rateArray(kind).at(index);
    const rawValues = [row.get('CO2')?.value, row.get('CH4')?.value, row.get('N2O')?.value];
    const [CO2, CH4, N2O] = rawValues.map(Number);
    row.get('co2Emissions')?.setValue(
      rawValues.every(value => value !== null && value !== undefined && value !== '')
        && [CO2, CH4, N2O].every(Number.isFinite)
        ? calculateGridFactorOutputRate(CO2, CH4, N2O)
        : undefined,
      { emitEvent: false }
    );
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
      const saved = this.isAdd
        ? await this.gridFactors.create(this.buildGridFactor())
        : await this.gridFactors.update(this.buildGridFactor(), this.previousSubregion);
      this.form.markAsPristine();
      this.dirtyChange.emit(false);
      this.saved.emit(saved);
    } catch (error) {
      console.warn('v1 custom grid factor save failed.', error);
      this.saveError = 'The grid factor could not be saved. Review the form and try again.';
    } finally {
      this.isSaving = false;
      this.savingChange.emit(false);
    }
  }

  private buildForm(item: IdbCustomEmissionsItem): FormGroup {
    return this.formBuilder.group({
      subregion: [item.subregion, [Validators.required, this.uniqueNameValidator(item.guid)]],
      directEmissionsRate: [item.directEmissionsRate === true],
      locationEmissionRates: this.formBuilder.array(
        (item.locationEmissionRates.length ? item.locationEmissionRates : [{} as EmissionsRate]).map(rate => this.buildRateGroup(rate)),
        { validators: [this.uniqueYearsValidator()] }
      ),
      residualEmissionRates: this.formBuilder.array(
        (item.residualEmissionRates.length ? item.residualEmissionRates : [{} as EmissionsRate]).map(rate => this.buildRateGroup(rate)),
        { validators: [this.uniqueYearsValidator()] }
      )
    });
  }

  private buildRateGroup(rate: EmissionsRate): FormGroup {
    return this.formBuilder.group({
      year: [rate.year ?? null, [Validators.required, Validators.min(1990), Validators.max(new Date().getFullYear())]],
      CO2: [rate.CO2],
      CH4: [rate.CH4],
      N2O: [rate.N2O],
      co2Emissions: [rate.co2Emissions]
    });
  }

  private updateRateValidators(emitEvent = true): void {
    const requiredNonnegative = [Validators.required, Validators.min(0)];
    for (const array of [this.locationRates, this.residualRates]) {
      for (const row of array.controls) {
        for (const name of ['CO2', 'CH4', 'N2O']) {
          const control = row.get(name);
          this.directRate ? control?.clearValidators() : control?.setValidators(requiredNonnegative);
          control?.updateValueAndValidity({ emitEvent: false });
        }
        const output = row.get('co2Emissions');
        this.directRate ? output?.setValidators(requiredNonnegative) : output?.clearValidators();
        output?.updateValueAndValidity({ emitEvent: false });
      }
      array.updateValueAndValidity({ emitEvent: false });
    }
    this.form.updateValueAndValidity({ emitEvent });
  }

  private recalculateAll(): void {
    if (this.directRate) return;
    for (const kind of ['location', 'residual'] as const) {
      this.rateArray(kind).controls.forEach((_row, index) => this.recalculateRate(kind, index));
    }
  }

  private rateArray(kind: 'location' | 'residual'): FormArray {
    return kind === 'location' ? this.locationRates : this.residualRates;
  }

  private buildGridFactor(): IdbCustomEmissionsItem {
    const values = this.form.getRawValue();
    const buildRates = (rows: any[]): IdbCustomEmissionsItem['locationEmissionRates'] => sortedGridFactorRates(rows.map(row => ({
      year: Number(row.year),
      CO2: Number(row.CO2 ?? 0),
      CH4: Number(row.CH4 ?? 0),
      N2O: Number(row.N2O ?? 0),
      co2Emissions: this.directRate
        ? Number(row.co2Emissions)
        : calculateGridFactorOutputRate(Number(row.CO2), Number(row.CH4), Number(row.N2O))
    })));
    return {
      ...this.draft,
      subregion: String(values.subregion).trim(),
      directEmissionsRate: values.directEmissionsRate === true,
      locationEmissionRates: buildRates(values.locationEmissionRates),
      residualEmissionRates: buildRates(values.residualEmissionRates)
    };
  }

  private uniqueNameValidator(currentGuid?: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = String(control.value || '').trim();
      if (!value) return null;
      return this.gridFactors.isNameAvailable(value, currentGuid) ? null : { duplicateGridFactorName: true };
    };
  }

  private uniqueYearsValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const rows = control.value as Array<{ year: number | null }>;
      const years = rows.map(row => row.year).filter(year => year !== null && year !== undefined);
      return new Set(years).size === years.length ? null : { duplicateYears: true };
    };
  }
}
