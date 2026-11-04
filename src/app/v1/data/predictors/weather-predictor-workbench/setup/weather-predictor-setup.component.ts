import { TemplatePortal } from '@angular/cdk/portal';
import { Component, OnDestroy, TemplateRef, ViewChild, ViewContainerRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormArray, FormControl, FormGroup, PristineChangeEvent, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { distinctUntilChanged, filter, map } from 'rxjs';
import { WeatherStation } from '@data/models/degreeDays';
import { WeatherDataType } from '@data/models/idbModels/predictor';
import { getWeatherSearchFromFacility } from '@shared/sharedHelperFunctions';
import { HasUnsavedChanges } from '@app/v1/shared/navigation/unsaved-changes.guard';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { ConfirmationDialogComponent } from '@app/v1/shared/a11y/confirmation-dialog.component';
import { ConflictChoices, DraftConflict } from '@app/v1/data/editing/draft-reconciliation';
import { registerDataDraft } from '@app/v1/data/editing/register-data-draft';
import { EditorConflictReviewComponent } from '@app/v1/data/editing/editor-conflict-review/editor-conflict-review.component';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { WeatherMonthRange } from '@platform/weather/hourly-weather-data.models';
import { FacilityPredictorsWorkspaceService } from '../../facility-predictors-workspace.service';
import { WEATHER_DATA_TYPE_OPTIONS, weatherPredictorUnit } from '../../models/predictor-settings.models';
import { defaultWeatherPredictorName } from '../../models/weather-presentation.models';
import type {
  WeatherStationGroupDefinition,
  WeatherStationGroupDraft,
  WeatherStationGroupPreview
} from '../../models/weather-reconciliation.models';
import {
  validateWeatherMonthRange,
  weatherFutureMonthCount,
  weatherLastTwoYearsRange,
  weatherRangeForReadings
} from '../../models/weather-range.models';
import { PredictorWeatherWorkflowService } from '../../predictor-weather-workflow.service';
import { WeatherStationSelectorComponent } from '../../shared/weather-station-selector/weather-station-selector.component';
import { WeatherPredictorWorkbenchContextService } from '../weather-predictor-workbench-context.service';
import { WeatherDefinitionValue, WeatherSetupValue, reconcileWeatherSetup, weatherEditIdentity, weatherSetupEqual } from '../weather-edit.models';

interface EditableWeatherDefinition extends WeatherStationGroupDefinition {
  readonly draftId: string;
  readonly unit: string;
}

type WeatherDefinitionForm = FormGroup<{
  draftId: FormControl<string>;
  predictorGuid: FormControl<string | null>;
  weatherDataType: FormControl<WeatherDataType>;
  name: FormControl<string>;
  baseTemperature: FormControl<number | null>;
  production: FormControl<boolean>;
}>;

type WeatherSetupForm = FormGroup<{
  station: FormControl<WeatherStation | null>;
  startMonth: FormControl<string>;
  endMonth: FormControl<string>;
  definitions: FormArray<WeatherDefinitionForm>;
}>;

@Component({
  selector: 'app-weather-predictor-setup',
  templateUrl: './weather-predictor-setup.component.html',
  styleUrls: ['./weather-predictor-setup.component.css'],
  standalone: true,
  imports: [ReactiveFormsModule, ConfirmationDialogComponent, IconComponent, WeatherStationSelectorComponent, EditorConflictReviewComponent]
})
export class WeatherPredictorSetupComponent implements HasUnsavedChanges, OnDestroy {
  private readonly router = inject(Router);
  private readonly modalPortal = inject(ModalPortalService);
  private readonly viewContainerRef = inject(ViewContainerRef);
  readonly workspace = inject(FacilityPredictorsWorkspaceService);
  readonly context = inject(WeatherPredictorWorkbenchContextService);
  readonly workflow = inject(PredictorWeatherWorkflowService);
  readonly navigation = inject(WorkspaceNavigationService);

  // Read after shared-module initialization rather than capturing a hoisted test-bundle alias.
  get weatherTypes(): typeof WEATHER_DATA_TYPE_OPTIONS { return WEATHER_DATA_TYPE_OPTIONS; }
  readonly form: WeatherSetupForm = new FormGroup({
    station: new FormControl<WeatherStation | null>(null, Validators.required),
    startMonth: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    endMonth: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    definitions: new FormArray<WeatherDefinitionForm>([])
  }, { validators: weatherRangeValidator });
  private readonly formSnapshot = signal<WeatherSetupValue>(this.form.getRawValue());
  private readonly formDirty = toSignal(this.form.events.pipe(
    filter((event): event is PristineChangeEvent => event instanceof PristineChangeEvent),
    map(event => !event.pristine), distinctUntilChanged()
  ), { initialValue: this.form.dirty });
  readonly conflicts = signal<readonly DraftConflict[]>([]);
  readonly editIdentity = computed(() => weatherEditIdentity(this.workspace.account()?.guid, this.workspace.facility()?.guid,
    this.context.creating() ? 'new' : this.context.groupKey()));
  readonly missing = computed(() => !this.context.creating() && !this.context.group());
  readonly station = computed(() => this.formSnapshot().station ?? undefined);
  readonly startMonth = computed(() => this.formSnapshot().startMonth);
  readonly endMonth = computed(() => this.formSnapshot().endMonth);
  readonly definitions = computed<readonly EditableWeatherDefinition[]>(() => this.formSnapshot().definitions.map(value => ({
    ...value,
    predictorGuid: value.predictorGuid ?? undefined,
    baseTemperature: value.baseTemperature ?? undefined,
    unit: weatherPredictorUnit(value.weatherDataType)
  })));
  readonly removedPredictors = computed(() => {
    const saved = new Set(this.context.group()?.predictors.map(predictor => predictor.guid) ?? []);
    return this.definitions().filter(definition => !!definition.predictorGuid && !saved.has(definition.predictorGuid));
  });
  readonly stationPreviewRange = computed(() => {
    const start = this.startMonth();
    const end = this.endMonth();
    return rangeFromInputs(start, end) ?? (!start && !end ? weatherLastTwoYearsRange() : undefined);
  });
  readonly futureMonthCount = computed(() => {
    const range = this.stationPreviewRange();
    return range ? weatherFutureMonthCount(range) : 0;
  });
  readonly preview = signal<WeatherStationGroupPreview | undefined>(undefined);
  readonly dirty = computed(() => this.formDirty() || this.conflicts().length > 0);
  readonly saveError = signal<string | undefined>(undefined);
  readonly committing = signal(false);
  readonly saveCompleted = signal(false);
  readonly deleting = signal(false);
  readonly deleteError = signal<string | undefined>(undefined);
  readonly initialStationSearch = computed(() => {
    const facility = this.workspace.facility();
    return facility ? getWeatherSearchFromFacility(facility) : '';
  });
  readonly isCreation = this.context.creating;
  readonly canEdit = computed(() => this.workspace.canWrite()
    && !!this.editIdentity() && !this.missing() && this.conflicts().length === 0
    && !this.workspace.hasPending()
    && !this.workflow.busy()
    && !this.committing()
    && !this.deleting());
  readonly canDelete = computed(() => !!this.context.group()
    && this.canEdit());

  private initializedContext: string | undefined;
  private savedSnapshot: WeatherSetupValue | undefined;
  private conflictInput: { base: WeatherSetupValue; local: WeatherSetupValue; saved: WeatherSetupValue } | undefined;
  private observedRevision: number | undefined;
  private requestToken = 0;
  private destroyed = false;
  private savingReviewed = false;
  private pendingCommittedSource: WeatherSetupValue | undefined;
  private nextDraftId = 0;
  private deleteModalOpen = false;
  private saveModalOpen = false;
  private postSaveRoute: { route: string[]; queryParams?: import('@angular/router').Params } | undefined;
  @ViewChild('saveChangesConfirmModal') private readonly saveChangesConfirmModal?: TemplateRef<unknown>;
  @ViewChild('deleteStationConfirmModal') private readonly deleteStationConfirmModal?: TemplateRef<unknown>;
  private readonly initializeEffect = effect(() => {
    const group = this.context.group();
    const creation = this.context.creating();
    const defaultRange = this.workspace.defaultWeatherRange();
    const identity = this.editIdentity();
    const readings = this.workspace.predictorReadings();
    const revision = this.workspace.revision();
    untracked(() => {
      if (!identity) return;
      this.form.controls.definitions.setValidators(creation ? Validators.required : null);
      this.form.controls.definitions.updateValueAndValidity({ emitEvent: false });
      if (identity !== this.initializedContext) {
        this.committing.set(false);
        this.deleting.set(false);
        this.savingReviewed = false;
        this.pendingCommittedSource = undefined;
        this.invalidateReview();
        this.initializedContext = identity;
        this.savedSnapshot = undefined;
        this.conflictInput = undefined;
        this.conflicts.set([]);
        if (creation || group) this.initialize(group, defaultRange);
        else this.applySnapshot({ station: null, startMonth: '', endMonth: '', definitions: [] }, true);
      } else if (creation || group) {
        const saved = this.snapshotForGroup(group, defaultRange, readings);
        if (this.savingReviewed) { if (group) this.pendingCommittedSource = saved; }
        else if (!this.savedSnapshot) this.initialize(group, defaultRange);
        else if (!weatherSetupEqual(saved, this.savedSnapshot)) {
          const base = this.conflictInput?.base ?? this.savedSnapshot;
          const local = this.conflictInput?.local ?? this.form.getRawValue();
          this.mergeSource(base, local, saved);
        }
      }
      if (revision !== this.observedRevision && !this.committing()) this.invalidateReview();
      this.observedRevision = revision;
      if (!creation && !group && !this.savingReviewed) this.invalidateReview();
    });
  });
  private readonly enabledEffect = effect(() => {
    const canEdit = this.canEdit();
    untracked(() => {
      const dirty = this.form.dirty;
      canEdit ? this.form.enable({ emitEvent: false }) : this.form.disable({ emitEvent: false });
      if (dirty) this.form.markAsDirty();
    });
  });

  constructor() {
    registerDataDraft(this.dirty, () => this.discardChanges(), computed(() => this.isNavigationBlocked()));
    this.form.valueChanges.pipe(
      map(() => this.normalizeDefinitionChanges()),
      takeUntilDestroyed()
    ).subscribe(value => {
      if (JSON.stringify(value) === JSON.stringify(this.formSnapshot())) return;
      this.form.markAsDirty();
      this.formSnapshot.set(value);
      this.markChanged();
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.requestToken++;
    this.hideSaveModal();
    this.hideDeleteModal();
    this.workflow.reset();
  }

  hasUnsavedChanges(): boolean { return this.dirty(); }
  canSubmit(): boolean { return this.canEdit() && this.form.valid && this.removedPredictors().length === 0; }
  isNavigationBlocked(): boolean { return this.workflow.busy() || this.committing() || this.deleting(); }
  discardChanges(): void {
    this.initialize(this.context.group(), this.workspace.defaultWeatherRange());
  }

  resolveConflicts(choices: ConflictChoices): void {
    const input = this.conflictInput;
    if (input) this.mergeSource(input.base, input.local, input.saved, choices);
  }

  selectStation(station: WeatherStation): void {
    if (!this.canEdit()) return;
    const range = this.stationPreviewRange();
    if (!this.startMonth() && !this.endMonth() && range) {
      this.form.patchValue({ startMonth: toMonthInput(range.start), endMonth: toMonthInput(range.end) }, { emitEvent: false });
    }
    this.form.controls.station.setValue({ ID: station.ID, name: station.name } as WeatherStation);
  }
  setStartMonth(value: string): void {
    if (!this.canEdit()) return;
    this.form.controls.startMonth.setValue(value);
  }
  setEndMonth(value: string): void {
    if (!this.canEdit()) return;
    this.form.controls.endMonth.setValue(value);
  }

  addDefinition(type: WeatherDataType = 'HDD'): void {
    if (!this.canEdit()) return;
    const baseTemperature = isDegreeDay(type) ? 60 : undefined;
    this.form.controls.definitions.push(this.buildDefinitionForm({
      draftId: this.newDraftId(),
      weatherDataType: type,
      name: defaultWeatherPredictorName(type, baseTemperature),
      unit: weatherPredictorUnit(type),
      baseTemperature,
      production: false
    }));
  }

  removeDefinition(draftId: string): void {
    if (!this.canEdit()) return;
    const index = this.form.controls.definitions.controls.findIndex(form => form.controls.draftId.value === draftId);
    if (index >= 0) this.form.controls.definitions.removeAt(index);
  }

  setDefinitionType(draftId: string, value: WeatherDataType): void {
    if (!this.canEdit()) return;
    this.definitionForm(draftId)?.controls.weatherDataType.setValue(value);
  }
  setDefinitionName(draftId: string, name: string): void {
    if (!this.canEdit()) return;
    this.definitionForm(draftId)?.controls.name.setValue(name);
  }
  setDefinitionBase(draftId: string, value: string): void {
    if (!this.canEdit()) return;
    this.definitionForm(draftId)?.controls.baseTemperature.setValue(value === '' ? null : Number(value));
  }

  async saveAndUpdateReadings(): Promise<void> {
    const draft = this.buildDraft();
    const template = this.saveChangesConfirmModal;
    if (!draft || !template || !this.canSubmit()) return;
    this.preview.set(undefined);
    this.saveCompleted.set(false);
    this.postSaveRoute = undefined;
    this.saveError.set(undefined);
    this.committing.set(true);
    const request = ++this.requestToken;
    const identity = this.editIdentity();
    const draftFingerprint = JSON.stringify(draft);
    const revision = this.workspace.revision();
    const group = this.context.group();
    const readings = this.context.readings();
    const facility = this.workspace.facility();
    if (!facility) {
      this.committing.set(false);
      return;
    }
    try {
      const preview = await this.workflow.previewStationGroup(draft, group?.predictors ?? [], readings);
      if (!preview || this.destroyed || request !== this.requestToken || identity !== this.editIdentity()
        || draftFingerprint !== JSON.stringify(this.buildDraft()) || revision !== this.workspace.revision()) return;
      this.preview.set(preview);
      this.saveModalOpen = true;
      this.modalPortal.show(new TemplatePortal(template, this.viewContainerRef));
    } catch (error) {
      if (!this.destroyed && identity === this.editIdentity() && request === this.requestToken) {
        this.saveError.set(error instanceof Error ? error.message : 'The weather station changes could not be prepared.');
      }
    } finally {
      if (!this.destroyed && identity === this.editIdentity()) this.committing.set(false);
    }
  }

  async confirmSaveAndUpdateReadings(): Promise<void> {
    const preview = this.preview();
    const facility = this.workspace.facility();
    if (!preview || !facility || this.committing() || this.saveCompleted()) return;
    if (preview.workspaceRevision !== this.workspace.revision() || this.conflicts().length || this.missing()) {
      this.invalidateReview();
      this.saveError.set('Saved weather data changed. Review the latest changes before saving.');
      return;
    }
    const identity = this.editIdentity();
    const submitted = this.form.getRawValue();
    this.committing.set(true);
    this.savingReviewed = true;
    this.pendingCommittedSource = undefined;
    this.saveError.set(undefined);
    try {
      await this.workflow.commitStationGroup(preview);
      if (this.destroyed || identity !== this.editIdentity()) return;
      const acknowledged = this.committedSnapshot(preview, submitted);
      const saved = this.pendingCommittedSource ?? acknowledged;
      if (weatherSetupEqual(submitted, this.form.getRawValue())) {
        this.savedSnapshot = saved; this.conflictInput = undefined; this.conflicts.set([]);
        this.applySnapshot(saved, true);
      } else {
        const addedIds = new Map(submitted.definitions.map((definition, index) => [definition.draftId, acknowledged.definitions[index]]));
        const current = this.form.getRawValue();
        const local = { ...current, definitions: current.definitions.map(definition => {
          const added = addedIds.get(definition.draftId);
          return !definition.predictorGuid && added?.predictorGuid
            ? { ...definition, predictorGuid: added.predictorGuid, draftId: added.draftId } : definition;
        }) };
        this.mergeSource(acknowledged, local, saved);
      }
      this.preview.set(preview);
      this.saveCompleted.set(true);
      if (!this.saveModalOpen && this.saveChangesConfirmModal) {
        this.saveModalOpen = true;
        this.modalPortal.show(new TemplatePortal(this.saveChangesConfirmModal, this.viewContainerRef));
      }
      this.postSaveRoute = preview.addPredictors.length + preview.updatePredictors.length === 0
        ? this.navigation.facilityInventoryLink(facility.guid, 'predictors')
        : { route: this.navigation.facilityWeatherPredictorRoute(facility.guid, `station:${preview.station.ID}`) };
    } catch (error) {
      if (!this.destroyed && identity === this.editIdentity()) {
        this.saveError.set(error instanceof Error ? error.message : 'The weather station changes could not be saved.');
      }
    } finally {
      if (!this.destroyed && identity === this.editIdentity()) {
        this.savingReviewed = false;
        this.committing.set(false);
        if (!this.saveCompleted() && this.pendingCommittedSource && this.savedSnapshot) {
          this.mergeSource(this.savedSnapshot, this.form.getRawValue(), this.pendingCommittedSource);
        }
        this.pendingCommittedSource = undefined;
      }
    }
  }

  closeSaveProcess(): void {
    if (this.committing()) return;
    const route = this.postSaveRoute;
    this.hideSaveModal();
    this.preview.set(undefined);
    this.saveCompleted.set(false);
    this.workflow.reset();
    if (route) {
      this.postSaveRoute = undefined;
      void this.router.navigate(route.route, { queryParams: route.queryParams });
    }
  }

  requestDeleteStation(): void {
    const template = this.deleteStationConfirmModal;
    if (!template || !this.canDelete()) return;
    this.deleteError.set(undefined);
    this.deleteModalOpen = true;
    this.modalPortal.show(new TemplatePortal(template, this.viewContainerRef));
  }

  cancelDeleteStation(): void {
    if (!this.deleting()) {
      this.deleteError.set(undefined);
      this.hideDeleteModal();
    }
  }

  async confirmDeleteStation(): Promise<void> {
    const group = this.context.group();
    const facility = this.workspace.facility();
    if (!group || !facility || !this.canDelete()) return;
    const identity = this.editIdentity();
    const revision = this.workspace.revision();
    const currentIds = new Set(group.predictors.map(predictor => predictor.guid));
    const readings = this.workspace.predictorReadings().filter(reading => currentIds.has(reading.predictorId));
    const range = weatherRangeForReadings(readings) ?? this.workspace.defaultWeatherRange();
    if (!range) {
      this.deleteError.set('The weather station date range could not be determined.');
      return;
    }
    this.deleting.set(true);
    this.deleteError.set(undefined);
    try {
      const preview = await this.workflow.previewStationGroup({
        sourceGroupKey: group.routeKey,
        station: { ID: group.stationId, name: group.stationName } as WeatherStation,
        range,
        definitions: []
      }, group.predictors, readings);
      if (this.destroyed || identity !== this.editIdentity() || revision !== this.workspace.revision()) return;
      if (!preview) {
        this.deleteError.set(this.workflow.state().error || 'The weather station could not be deleted.');
        return;
      }
      await this.workflow.commitStationGroup(preview);
      if (this.destroyed || identity !== this.editIdentity()) return;
      this.markPristine();
      this.hideDeleteModal();
      this.deleting.set(false);
      await this.navigation.openFacilityInventory(facility.guid, 'predictors');
    } catch (error) {
      if (!this.destroyed && identity === this.editIdentity()) this.deleteError.set(error instanceof Error ? error.message : 'The weather station could not be deleted.');
    } finally {
      if (!this.destroyed && identity === this.editIdentity()) this.deleting.set(false);
    }
  }

  private initialize(group = this.context.group(), defaultRange = this.workspace.defaultWeatherRange()): void {
    this.invalidateReview();
    const saved = this.snapshotForGroup(group, defaultRange);
    this.savedSnapshot = saved;
    this.conflictInput = undefined;
    this.conflicts.set([]);
    this.applySnapshot(saved, true);
    this.saveError.set(undefined);
  }

  private snapshotForGroup(group = this.context.group(), defaultRange = this.workspace.defaultWeatherRange(),
    readings = this.workspace.predictorReadings()): WeatherSetupValue {
    const groupIds = new Set(group?.predictors.map(predictor => predictor.guid) ?? []);
    const range = weatherRangeForReadings(readings.filter(reading => groupIds.has(reading.predictorId)))
      ?? defaultRange ?? (group ? weatherLastTwoYearsRange() : undefined);
    return {
      station: group?.stationId ? { ID: group.stationId, name: group.stationName } as WeatherStation : null,
      startMonth: range ? toMonthInput(range.start) : '',
      endMonth: range ? toMonthInput(range.end) : '',
      definitions: group?.predictors.map(predictor => ({
        draftId: `weather-definition-${predictor.guid}`, predictorGuid: predictor.guid,
        weatherDataType: predictor.weatherDataType, name: predictor.name,
        baseTemperature: (predictor.weatherDataType === 'HDD' ? predictor.heatingBaseTemperature
          : predictor.weatherDataType === 'CDD' ? predictor.coolingBaseTemperature : undefined) ?? null,
        production: !!predictor.production
      })) ?? [{
        draftId: 'weather-definition-initial', predictorGuid: null, weatherDataType: 'HDD',
        name: defaultWeatherPredictorName('HDD', 60), baseTemperature: 60, production: false
      }]
    };
  }

  private committedSnapshot(preview: WeatherStationGroupPreview, submitted: WeatherSetupValue): WeatherSetupValue {
    const existing = new Map(preview.updatePredictors.map(predictor => [predictor.guid, predictor]));
    let addedIndex = 0;
    return { ...submitted, definitions: submitted.definitions.map(definition => {
      const predictor = definition.predictorGuid ? existing.get(definition.predictorGuid) : preview.addPredictors[addedIndex++];
      if (!predictor?.guid) return definition;
      return { ...definition, draftId: `weather-definition-${predictor.guid}`, predictorGuid: predictor.guid,
        weatherDataType: predictor.weatherDataType, name: predictor.name, production: !!predictor.production,
        baseTemperature: (predictor.weatherDataType === 'HDD' ? predictor.heatingBaseTemperature
          : predictor.weatherDataType === 'CDD' ? predictor.coolingBaseTemperature : undefined) ?? null };
    }) };
  }

  private mergeSource(base: WeatherSetupValue, local: WeatherSetupValue, saved: WeatherSetupValue,
    choices: ConflictChoices = {}): void {
    const merged = reconcileWeatherSetup(base, local, saved, choices);
    this.savedSnapshot = saved;
    this.conflictInput = merged.conflicts.length ? { base: merged.baseline ?? saved, local: merged.value, saved } : undefined;
    this.conflicts.set(merged.conflicts);
    this.applySnapshot(merged.value, weatherSetupEqual(merged.value, saved));
    this.invalidateReview();
  }

  private applySnapshot(value: WeatherSetupValue, pristine: boolean): void {
    const array = this.form.controls.definitions;
    const existing = new Map(array.controls.map(form => [form.controls.predictorGuid.value ?? form.controls.draftId.value, form]));
    const controls = value.definitions.map(definition => {
      const form = existing.get(definition.predictorGuid ?? definition.draftId) ?? this.buildDefinitionForm(definition);
      form.patchValue(definition, { emitEvent: false });
      return form;
    });
    if (controls.some((control, index) => control !== array.at(index)) || controls.length !== array.length) {
      array.clear({ emitEvent: false });
      controls.forEach(control => array.push(control, { emitEvent: false }));
    }
    this.form.patchValue({ station: value.station, startMonth: value.startMonth, endMonth: value.endMonth }, { emitEvent: false });
    if (!this.canEdit()) this.form.disable({ emitEvent: false });
    pristine ? this.form.markAsPristine() : this.form.markAsDirty();
    this.formSnapshot.set(this.form.getRawValue());
  }

  private invalidateReview(): void {
    this.requestToken++;
    this.preview.set(undefined);
    this.saveCompleted.set(false);
    this.postSaveRoute = undefined;
    this.hideSaveModal();
    this.hideDeleteModal();
    if (!this.committing()) this.workflow.reset();
  }

  private buildDraft(): WeatherStationGroupDraft | undefined {
    const station = this.station();
    const range = this.stationPreviewRange();
    if (!station || !range) return undefined;
    return {
      sourceGroupKey: this.context.group()?.routeKey,
      station,
      range,
      definitions: this.definitions().map(({ draftId: _draftId, ...definition }) => definition)
    };
  }

  private buildDefinitionForm(definition: EditableWeatherDefinition | WeatherDefinitionValue): WeatherDefinitionForm {
    return new FormGroup({
      draftId: new FormControl(definition.draftId, { nonNullable: true }),
      predictorGuid: new FormControl<string | null>(definition.predictorGuid ?? null),
      weatherDataType: new FormControl(definition.weatherDataType, { nonNullable: true }),
      name: new FormControl(definition.name, { nonNullable: true, validators: [Validators.required, nonBlankName, Validators.maxLength(100)] }),
      baseTemperature: new FormControl<number | null>(definition.baseTemperature ?? null),
      production: new FormControl(definition.production, { nonNullable: true })
    }, { validators: weatherDefinitionValidator });
  }
  private definitionForm(draftId: string): WeatherDefinitionForm | undefined {
    return this.form.controls.definitions.controls.find(form => form.controls.draftId.value === draftId);
  }
  private normalizeDefinitionChanges(): ReturnType<typeof this.form.getRawValue> {
    const previous = new Map(this.formSnapshot().definitions.map(definition => [definition.draftId, definition]));
    for (const form of this.form.controls.definitions.controls) {
      const current = form.getRawValue();
      const prior = previous.get(current.draftId);
      if (!prior) continue;
      const typeChanged = current.weatherDataType !== prior.weatherDataType;
      const baseChanged = current.baseTemperature !== prior.baseTemperature;
      if (!typeChanged && !baseChanged) continue;
      const baseTemperature = typeChanged
        ? isDegreeDay(current.weatherDataType) ? 60 : null
        : current.baseTemperature;
      const previousDefault = defaultWeatherPredictorName(prior.weatherDataType, prior.baseTemperature ?? undefined);
      form.patchValue({
        baseTemperature,
        name: current.name === previousDefault
          ? defaultWeatherPredictorName(current.weatherDataType, baseTemperature ?? undefined)
          : current.name
      }, { emitEvent: false });
    }
    return this.form.getRawValue();
  }
  private markPristine(): void {
    this.form.markAsPristine();
  }
  private markChanged(): void { this.invalidateReview(); this.saveError.set(undefined); }
  private hideSaveModal(): void {
    if (!this.saveModalOpen) return;
    this.saveModalOpen = false;
    this.modalPortal.hide();
  }
  private hideDeleteModal(): void {
    if (!this.deleteModalOpen) return;
    this.deleteModalOpen = false;
    this.modalPortal.hide();
  }
  private newDraftId(): string { return `weather-definition-${++this.nextDraftId}`; }
}

function isDegreeDay(type: WeatherDataType): boolean { return type === 'HDD' || type === 'CDD'; }
function nonBlankName(control: AbstractControl<string>): ValidationErrors | null {
  return control.value.trim() ? null : { required: true };
}
function weatherDefinitionValidator(control: AbstractControl): ValidationErrors | null {
  const form = control as WeatherDefinitionForm;
  return isDegreeDay(form.controls.weatherDataType.value) && !Number.isFinite(form.controls.baseTemperature.value)
    ? { weatherBaseRequired: true } : null;
}
function weatherRangeValidator(control: AbstractControl): ValidationErrors | null {
  const form = control as WeatherSetupForm;
  const { startMonth, endMonth } = form.getRawValue();
  if (!startMonth || !endMonth) return { weatherRange: 'Enter both a start and end month.' };
  const range = rangeFromInputs(startMonth, endMonth);
  const message = range ? validateWeatherMonthRange(range) : 'Enter a valid start and end month.';
  return message ? { weatherRange: message } : null;
}
function rangeFromInputs(start: string, end: string): WeatherMonthRange | undefined {
  const startMonth = parseMonthInput(start);
  const endMonth = parseMonthInput(end);
  return startMonth && endMonth ? { start: startMonth, end: endMonth } : undefined;
}
function parseMonthInput(value: string): { year: number; month: number } | undefined {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  return match ? { year: Number(match[1]), month: Number(match[2]) } : undefined;
}
function toMonthInput(month: { year: number; month: number }): string {
  return `${month.year}-${String(month.month).padStart(2, '0')}`;
}
