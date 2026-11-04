import { Component, EventEmitter, HostListener, Input, OnChanges, OnDestroy, Output, SimpleChanges, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { IdbPredictor, isStandardPredictor } from '@data/models/idbModels/predictor';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { WorkspaceSlideoutComponent } from '@app/v1/shared/workspace-slideout/workspace-slideout.component';
import { ConflictChoices, DraftConflict, draftEqual, reconcileFields } from '@app/v1/data/editing/draft-reconciliation';
import { registerDataDraft } from '@app/v1/data/editing/register-data-draft';
import { EditorConflictReviewComponent } from '@app/v1/data/editing/editor-conflict-review/editor-conflict-review.component';
import { PredictorReadingEditorMode, PredictorReadingSaveRequest } from '../../../models';
import { PredictorReadingForm, PredictorReadingFormService, PredictorReadingValues } from '../predictor-reading-form.service';

@Component({
  selector: 'app-predictor-reading-editor',
  templateUrl: './predictor-reading-editor.component.html',
  styleUrls: ['./predictor-reading-editor.component.css'],
  standalone: true,
  imports: [ReactiveFormsModule, IconComponent, WorkspaceSlideoutComponent, EditorConflictReviewComponent]
})
export class PredictorReadingEditorComponent implements OnChanges, OnDestroy {
  private readonly formService = inject(PredictorReadingFormService);

  @Input({ required: true }) predictor!: IdbPredictor;
  @Input({ required: true }) reading!: IdbPredictorData;
  @Input({ required: true }) mode!: PredictorReadingEditorMode;
  @Input() existingReadings: readonly IdbPredictorData[] = [];
  @Input() saving = false;
  @Input() canEdit = true;
  @Input() error?: string;
  @Output() saved = new EventEmitter<PredictorReadingSaveRequest>();
  @Output() cancelled = new EventEmitter<void>();

  form?: PredictorReadingForm;
  readonly conflicts = signal<readonly DraftConflict[]>([]);
  readonly unavailable = signal(false);
  private identity = '';
  private baseline?: PredictorReadingValues;
  private readonly latestValues = signal<PredictorReadingValues | undefined>(undefined);
  private readonly formValues = signal<PredictorReadingValues | undefined>(undefined);
  private readonly savingState = signal(false);
  readonly blocked = this.savingState.asReadonly();
  readonly dirty = computed(() => {
    const value = this.formValues(), latest = this.latestValues();
    return !!value && (this.conflicts().length > 0 || (!!latest && !draftEqual(value, latest)));
  });
  private get latest(): PredictorReadingValues | undefined { return this.latestValues(); }
  private set latest(value: PredictorReadingValues | undefined) { this.latestValues.set(value); }
  private latestReading?: IdbPredictorData;
  private formChanges?: Subscription;
  constructor() { registerDataDraft(this.dirty, () => this.discard(), this.blocked); }

  ngOnChanges(changes: SimpleChanges): void {
    this.savingState.set(this.saving);
    if (!this.predictor || !this.reading || !this.mode) return;
    const identity = [this.predictor.accountId, this.predictor.facilityId, this.predictor.guid, this.mode, this.reading.guid].join(':');
    const saved = this.mode === 'edit' ? this.existingReadings.find(reading => reading.guid === this.reading.guid)
      : this.reading;
    this.unavailable.set(!isStandardPredictor(this.predictor) || !saved);
    if (!this.form || identity !== this.identity) {
      this.identity = identity;
      this.formChanges?.unsubscribe();
      this.form = this.formService.build(this.predictor, saved ?? this.reading, this.existingReadings, this.mode);
      this.baseline = this.form.getRawValue();
      this.latest = this.baseline;
      this.conflicts.set([]);
      this.formValues.set(this.form.getRawValue());
      this.formChanges = this.form.events.subscribe(() => {
        const value = this.form!.getRawValue();
        if (draftEqual(value, this.formValues())) return;
        this.formValues.set(value);
        if (this.conflicts().length && this.baseline && this.latest) {
          const merged = reconcileFields(this.baseline, this.form!.getRawValue(), this.latest);
          this.formService.hydrate(this.form!, merged.value);
          this.baseline = merged.baseline ?? this.latest;
          this.conflicts.set(merged.conflicts);
          this.formValues.set(this.form!.getRawValue());
        }
      });
    } else if (saved && this.baseline && this.latest) {
      const next = this.formService.values(saved);
      if (!draftEqual(next, this.latest)) {
        const merged = reconcileFields(this.baseline, this.form.getRawValue(), next);
        this.formService.hydrate(this.form, merged.value);
        this.conflicts.set(merged.conflicts);
        this.latest = next;
        this.baseline = merged.baseline ?? next;
        draftEqual(merged.value, next) ? this.form.markAsPristine() : this.form.markAsDirty();
      }
    }
    this.latestReading = saved;
    this.formService.refreshValidation(this.form, this.predictor, this.reading.guid, this.existingReadings);
    if (this.saving || !this.canEdit || this.unavailable()) this.form.disable({ emitEvent: false });
    else this.form.enable({ emitEvent: false });
    this.formValues.set(this.form.getRawValue());
  }

  ngOnDestroy(): void { this.formChanges?.unsubscribe(); }
  hasUnsavedChanges(): boolean {
    return this.dirty();
  }
  discard(): void {
    if (this.saving) return;
    if (this.form && this.latest) {
      this.formService.hydrate(this.form, this.latest);
      this.form.markAsPristine();
      this.baseline = this.latest;
      this.conflicts.set([]);
      this.formValues.set(this.form.getRawValue());
    }
    this.cancelled.emit();
  }
  resolveConflicts(choices: ConflictChoices): void {
    if (!this.form || !this.baseline || !this.latest || this.saving) return;
    const merged = reconcileFields(this.baseline, this.form.getRawValue(), this.latest, { choices });
    this.formService.hydrate(this.form, merged.value);
    this.conflicts.set(merged.conflicts);
    this.formValues.set(this.form.getRawValue());
    this.baseline = merged.baseline ?? this.latest;
    draftEqual(merged.value, this.latest) ? this.form.markAsPristine() : this.form.markAsDirty();
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardSave(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      this.save(false);
    }
  }

  save(addAnother: boolean): void {
    if (!this.form || this.form.invalid || this.saving || !this.canEdit || this.unavailable() || this.conflicts().length
      || !this.latestReading) {
      this.form?.markAllAsTouched();
      return;
    }
    this.saved.emit({
      reading: this.formService.updateReading(this.latestReading, this.predictor, this.form),
      addAnother
    });
  }
}
