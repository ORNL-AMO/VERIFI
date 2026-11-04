import { TemplatePortal } from '@angular/cdk/portal';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { ConfirmationDialogComponent } from '@app/v1/shared/a11y/confirmation-dialog.component';
import { ConflictChoices, DraftConflict, draftEqual } from '@app/v1/data/editing/draft-reconciliation';
import { EditorConflictReviewComponent } from '@app/v1/data/editing/editor-conflict-review/editor-conflict-review.component';
import { meterReadingContextKey, reconcileMeterReading } from '../meter-reading-editing';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, TemplateRef, ViewChild, ViewContainerRef, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { IdbUtilityMeter, MeterCharge } from '@data/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { MeterSlideoutComponent } from '../../../shared/meter-slideout/meter-slideout.component';
import { MeterReadingForm, MeterReadingValues, normalizeMeterReading, readMeterReading, MeterReadingFormContext, MeterReadingFormService } from '../meter-reading-form.service';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { Subscription } from 'rxjs';

export interface MeterReadingBillSave {
  readonly reading: IdbUtilityMeterData;
  readonly addAnother: boolean;
  readonly baseline?: MeterReadingValues;
  readonly contextKey?: string;
}

interface MeterReadingBillChargeView {
  readonly guid: string;
  readonly name: string;
  readonly usageUnit?: string;
  readonly canShowUsage: boolean;
}

@Component({
  selector: 'app-meter-reading-bill-slideout',
  templateUrl: './meter-reading-bill-slideout.component.html',
  styleUrls: ['./meter-reading-bill-slideout.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MeterSlideoutComponent, IconComponent, EditorConflictReviewComponent, ConfirmationDialogComponent]
})
export class MeterReadingBillSlideoutComponent implements OnChanges, OnDestroy {
  private readonly formService = inject(MeterReadingFormService);
  private readonly modalPortal = inject(ModalPortalService);
  private readonly viewContainer = inject(ViewContainerRef);
  @ViewChild('discardBillConfirmation') private readonly discardTemplate?: TemplateRef<unknown>;
  discardPurpose: 'close' | 'replace' | 'reload' = 'close';
  private discardPromise?: Promise<boolean>;
  private discardResolver?: (confirmed: boolean) => void;
  private destroyed = false;
  private formSubscription?: Subscription;
  private readonly formValues = signal<MeterReadingValues | undefined>(undefined);
  private readonly latestValues = signal<MeterReadingValues | undefined>(undefined);
  private readonly conflictValues = signal<readonly DraftConflict[]>([]);
  private readonly changedContext = signal(false);
  private readonly savingState = signal(false);
  readonly blocked = this.savingState.asReadonly();
  readonly dirty = computed(() => {
    const value = this.formValues();
    return !!value && (this.conflictValues().length > 0 || this.changedContext() || !draftEqual(value, this.latestValues()));
  });

  @Input({ required: true }) meter!: IdbUtilityMeter;
  @Input({ required: true }) reading!: IdbUtilityMeterData;
  @Input({ required: true }) mode!: 'add' | 'edit';
  @Input() existingReadings: readonly IdbUtilityMeterData[] = [];
  @Input() saving = false;
  @Input() resourceAvailable = true;
  @Output() saved = new EventEmitter<MeterReadingBillSave>();
  @Output() cancelled = new EventEmitter<void>();

  form?: MeterReadingForm;
  editorMeter!: IdbUtilityMeter;
  get conflicts(): readonly DraftConflict[] { return this.conflictValues(); }
  set conflicts(value: readonly DraftConflict[]) { this.conflictValues.set(value); }
  get contextChanged(): boolean { return this.changedContext(); }
  set contextChanged(value: boolean) { this.changedContext.set(value); }
  missingReading = false;
  private baseline?: MeterReadingValues;
  private identity = '';
  private knownPersistedReading = false;
  context?: MeterReadingFormContext;
  chargeViews: readonly MeterReadingBillChargeView[] = [];

  get chargesArray() { return this.form?.controls.chargesArray; }

  ngOnChanges(changes: SimpleChanges): void {
    this.savingState.set(this.saving);
    if (!this.meter || !this.reading) return;
    const identity = [this.meter.accountId, this.meter.facilityId, this.meter.guid, this.reading.guid, this.mode].join('/');
    const current = this.mode === 'edit' ? this.existingReadings.find(item => item.guid === this.reading.guid) ?? this.reading : this.reading;
    if (identity !== this.identity || !this.form) {
      this.identity = identity;
      this.editorMeter = structuredClone(this.meter);
      this.baseline = readMeterReading(this.editorMeter, current);
      this.latestValues.set(this.baseline);
      this.observeForm(this.formService.buildForm(this.editorMeter, current, this.existingReadings));
      this.conflicts = []; this.contextChanged = false; this.missingReading = false;
      this.knownPersistedReading = this.mode === 'edit' && this.existingReadings.some(item => item.guid === this.reading.guid);
    } else if (changes['meter'] || changes['reading'] || changes['existingReadings']) {
      if (this.mode === 'edit' && this.knownPersistedReading) this.missingReading = !this.existingReadings.some(item => item.guid === this.reading.guid);
      const dirty = this.hasUnsavedChanges();
      const contextChanged = meterReadingContextKey(this.meter) !== meterReadingContextKey(this.editorMeter);
      if (dirty && contextChanged) this.contextChanged = true;
      else if (!dirty && contextChanged) {
        this.editorMeter = structuredClone(this.meter);
        this.baseline = readMeterReading(this.editorMeter, current);
        this.latestValues.set(this.baseline);
        this.observeForm(this.formService.buildForm(this.editorMeter, current, this.existingReadings));
      } else if (!this.contextChanged) {
        const saved = readMeterReading(this.editorMeter, current);
        const local = normalizeMeterReading(this.form.getRawValue());
        const base = this.baseline!;
        const merged = reconcileMeterReading(base, local, saved);
        this.formService.hydrate(this.form, merged.value);
        this.latestValues.set(saved);
        this.baseline = merged.baseline ?? saved;
        this.editorMeter = structuredClone(this.meter);
        this.conflicts = this.labelConflicts(merged.conflicts);
      }
      this.formService.refreshValidation(this.form, this.editorMeter, current, this.existingReadings);
    }
    this.context = this.formService.contextForMeter(this.editorMeter);
    this.chargeViews = this.buildChargeViews();
    this.formService.setEnabled(this.form, this.editorMeter, !this.saving && this.resourceAvailable && !this.contextChanged && !this.missingReading);
    this.formValues.set(normalizeMeterReading(this.form.getRawValue()));
  }

  hasUnsavedChanges(): boolean {
    return this.dirty();
  }
  confirmDiscard(purpose: 'close' | 'replace' | 'reload' = 'replace'): Promise<boolean> {
    if (this.saving || this.destroyed) return Promise.resolve(false);
    if (!this.hasUnsavedChanges()) return Promise.resolve(true);
    if (this.discardPromise) return this.discardPromise;
    if (!this.discardTemplate) return Promise.resolve(false);
    this.discardPurpose = purpose;
    this.discardPromise = new Promise(resolve => { this.discardResolver = resolve; });
    this.modalPortal.show(new TemplatePortal(this.discardTemplate, this.viewContainer));
    return this.discardPromise;
  }
  resolveDiscard(confirmed: boolean): void {
    const resolve = this.discardResolver;
    if (!resolve) return;
    this.discardResolver = undefined; this.discardPromise = undefined;
    this.modalPortal.hide(); resolve(confirmed);
  }
  async requestClose(): Promise<void> {
    if (this.saving) return;
    if (this.hasUnsavedChanges() && !await this.confirmDiscard('close')) return;
    if (!this.destroyed && !this.saving) this.cancelled.emit();
  }
  ngOnDestroy(): void { this.destroyed = true; this.formSubscription?.unsubscribe(); this.resolveDiscard(false); }
  resolveConflicts(choices: ConflictChoices): void {
    const latest = this.latestValues();
    if (!this.form || !this.baseline || !latest || this.saving) return;
    const merged = reconcileMeterReading(this.baseline, normalizeMeterReading(this.form.getRawValue()), latest, choices);
    this.formService.hydrate(this.form, merged.value);
    this.baseline = merged.baseline ?? latest;
    this.conflicts = this.labelConflicts(merged.conflicts);
    this.formValues.set(normalizeMeterReading(this.form.getRawValue()));
    this.chargeViews = this.buildChargeViews();
  }
  save(addAnother: boolean): void {
    if (!this.form || this.form.invalid || this.saving || !this.resourceAvailable || this.contextChanged || this.missingReading || this.conflicts.length) {
      this.form?.markAllAsTouched(); return;
    }
    this.saved.emit({ reading: this.formService.updateReadingFromForm(this.editorMeter, this.reading, this.form),
      baseline: this.baseline, contextKey: meterReadingContextKey(this.editorMeter), addAnother });
  }

  async reloadSavedBill(): Promise<void> {
    if (this.saving || this.missingReading || !this.resourceAvailable) return;
    if (this.hasUnsavedChanges() && !await this.confirmDiscard('reload')) return;
    if (this.destroyed || this.saving) return;
    const current = this.mode === 'edit' ? this.existingReadings.find(item => item.guid === this.reading.guid) ?? this.reading : this.reading;
    this.editorMeter = structuredClone(this.meter);
    this.baseline = readMeterReading(this.editorMeter, current);
    this.latestValues.set(this.baseline);
    this.observeForm(this.formService.buildForm(this.editorMeter, current, this.existingReadings));
    this.context = this.formService.contextForMeter(this.editorMeter);
    this.contextChanged = false; this.conflicts = [];
    this.chargeViews = this.buildChargeViews();
  }

  private labelConflicts(conflicts: readonly DraftConflict[]): readonly DraftConflict[] {
    return conflicts.map(conflict => {
      if (!conflict.id.startsWith('charges.')) return conflict;
      const guid = conflict.id.split('.')[1];
      const name = this.editorMeter.charges?.find(charge => charge.guid === guid)?.name?.trim() || 'Detailed charge';
      return { ...conflict, label: conflict.id.split('.').length > 2 ? `${name}: ${conflict.label}` : name };
    });
  }

  private observeForm(form: MeterReadingForm): void {
    this.formSubscription?.unsubscribe();
    this.form = form;
    this.formValues.set(normalizeMeterReading(form.getRawValue()));
    this.formSubscription = form.events.subscribe(() => {
      const value = normalizeMeterReading(form.getRawValue());
      if (draftEqual(value, this.formValues())) return;
      const latest = this.latestValues();
      if (this.conflicts.length && this.baseline && latest) {
        const merged = reconcileMeterReading(this.baseline, value, latest);
        this.formService.hydrate(form, merged.value);
        this.baseline = merged.baseline ?? latest;
        this.conflicts = this.labelConflicts(merged.conflicts);
      }
      this.formValues.set(normalizeMeterReading(form.getRawValue()));
      this.chargeViews = this.buildChargeViews();
    });
  }

  private buildChargeViews(): readonly MeterReadingBillChargeView[] {
    return (this.form?.controls.chargesArray.controls ?? []).map(chargeForm => {
      const guid = chargeForm.controls.chargeGuid.value;
      const charge = this.editorMeter.charges?.find(meterCharge => meterCharge.guid === guid);
      return {
        guid,
        name: formatChargeName(charge?.name),
        usageUnit: getChargeUsageUnit(charge, this.editorMeter),
        canShowUsage: canShowChargeUsage(charge, this.editorMeter)
      };
    });
  }
}

function formatChargeName(name: string | undefined): string {
  const trimmedName = name?.trim();
  if (!trimmedName) {
    return 'Charge';
  }
  return trimmedName
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ');
}

function getChargeUsageUnit(charge: MeterCharge | undefined, meter: IdbUtilityMeter): string | undefined {
  if (!charge) {
    return undefined;
  }
  if (meter.source === 'Electricity' && charge.chargeType === 'demand') {
    return meter.demandUnit || 'kW';
  }
  if (charge.chargeType === 'consumption' || charge.chargeType === 'sewer') {
    return meter.startingUnit;
  }
  return undefined;
}

function canShowChargeUsage(charge: MeterCharge | undefined, meter: IdbUtilityMeter): boolean {
  if (!charge) {
    return false;
  }
  if (meter.source === 'Electricity') {
    return charge.chargeType === 'consumption' || charge.chargeType === 'demand';
  }
  return charge.chargeType === 'sewer';
}
