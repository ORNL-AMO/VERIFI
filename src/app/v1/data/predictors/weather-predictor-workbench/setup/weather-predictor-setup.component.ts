import { TemplatePortal } from '@angular/cdk/portal';
import { Component, OnDestroy, TemplateRef, ViewChild, ViewContainerRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { map } from 'rxjs';
import { WeatherStation } from '@data/models/degreeDays';
import { WeatherDataType } from '@data/models/idbModels/predictor';
import { getWeatherSearchFromFacility } from '@shared/sharedHelperFunctions';
import { HasUnsavedChanges } from '@app/v1/shared/navigation/unsaved-changes.guard';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { ConfirmationDialogComponent } from '@app/v1/shared/a11y/confirmation-dialog.component';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
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

@Component({
  selector: 'app-weather-predictor-setup',
  templateUrl: './weather-predictor-setup.component.html',
  styleUrls: ['./weather-predictor-setup.component.css'],
  standalone: true,
  imports: [ReactiveFormsModule, ConfirmationDialogComponent, IconComponent, WeatherStationSelectorComponent]
})
export class WeatherPredictorSetupComponent implements HasUnsavedChanges, OnDestroy {
  private readonly router = inject(Router);
  private readonly unsavedChanges = inject(UnsavedChangesService);
  private readonly modalPortal = inject(ModalPortalService);
  private readonly viewContainerRef = inject(ViewContainerRef);
  readonly workspace = inject(FacilityPredictorsWorkspaceService);
  readonly context = inject(WeatherPredictorWorkbenchContextService);
  readonly workflow = inject(PredictorWeatherWorkflowService);
  readonly navigation = inject(WorkspaceNavigationService);

  // Read after shared-module initialization rather than capturing a hoisted test-bundle alias.
  get weatherTypes(): typeof WEATHER_DATA_TYPE_OPTIONS { return WEATHER_DATA_TYPE_OPTIONS; }
  readonly form = new FormGroup({
    station: new FormControl<WeatherStation | null>(null),
    startMonth: new FormControl('', { nonNullable: true }),
    endMonth: new FormControl('', { nonNullable: true }),
    definitions: new FormArray<WeatherDefinitionForm>([])
  });
  private readonly formSnapshot = signal(this.form.getRawValue());
  readonly station = computed(() => this.formSnapshot().station ?? undefined);
  readonly startMonth = computed(() => this.formSnapshot().startMonth);
  readonly endMonth = computed(() => this.formSnapshot().endMonth);
  readonly definitions = computed<readonly EditableWeatherDefinition[]>(() => this.formSnapshot().definitions.map(value => ({
    ...value,
    predictorGuid: value.predictorGuid ?? undefined,
    baseTemperature: value.baseTemperature ?? undefined,
    unit: weatherPredictorUnit(value.weatherDataType)
  })));
  readonly definitionErrors = computed(() => new Map(this.definitions().map(definition => [definition.draftId, {
    name: !definition.name.trim() || definition.name.trim().length > 100,
    base: isDegreeDay(definition.weatherDataType) && !Number.isFinite(definition.baseTemperature)
  }])));
  readonly stationPreviewRange = computed(() => {
    const start = this.startMonth();
    const end = this.endMonth();
    return rangeFromInputs(start, end) ?? (!start && !end ? weatherLastTwoYearsRange() : undefined);
  });
  readonly futureMonthCount = computed(() => {
    const range = this.stationPreviewRange();
    return range ? weatherFutureMonthCount(range) : 0;
  });
  readonly rangeError = computed(() => {
    const start = this.startMonth();
    const end = this.endMonth();
    if (!start || !end) return 'Enter both a start and end month.';
    const range = rangeFromInputs(start, end);
    return range ? validateWeatherMonthRange(range) : 'Enter a valid start and end month.';
  });
  readonly preview = signal<WeatherStationGroupPreview | undefined>(undefined);
  readonly dirty = computed(() => { this.formSnapshot(); return this.form.dirty; });
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
    && !this.workspace.hasPending()
    && !this.workflow.busy()
    && !this.committing()
    && !this.deleting());
  readonly canSubmit = computed(() => {
    const station = this.station();
    const range = this.stationPreviewRange();
    const definitions = this.definitions();
    return !!station
      && (!!this.context.group() || definitions.length > 0)
      && definitions.every(definition => definition.name.trim().length > 0
        && definition.name.trim().length <= 100
        && (!isDegreeDay(definition.weatherDataType) || Number.isFinite(definition.baseTemperature)))
      && !!range && !validateWeatherMonthRange(range)
      && this.canEdit();
  });
  readonly canDelete = computed(() => !!this.context.group()
    && this.canEdit());

  private initializedContext: string | undefined;
  private nextDraftId = 0;
  private deleteModalOpen = false;
  private saveModalOpen = false;
  private postSaveRoute: { route: string[]; queryParams?: import('@angular/router').Params } | undefined;
  @ViewChild('saveChangesConfirmModal') private readonly saveChangesConfirmModal?: TemplateRef<unknown>;
  @ViewChild('deleteStationConfirmModal') private readonly deleteStationConfirmModal?: TemplateRef<unknown>;
  private readonly unregisterUnsavedChanges = this.unsavedChanges.register(
    () => this.hasUnsavedChanges(),
    () => this.discardChanges(),
    () => this.isNavigationBlocked()
  );
  private readonly initializeEffect = effect(() => {
    const group = this.context.group();
    const creation = this.context.creating();
    const defaultRange = this.workspace.defaultWeatherRange();
    const context = creation ? 'new' : group?.routeKey;
    if (!context || context === this.initializedContext) return;
    untracked(() => this.initialize(group, defaultRange));
    this.initializedContext = context;
  });
  private readonly enabledEffect = effect(() => {
    const canEdit = this.canEdit();
    untracked(() => canEdit
      ? this.form.enable({ emitEvent: false })
      : this.form.disable({ emitEvent: false }));
  });

  constructor() {
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
    this.unregisterUnsavedChanges();
    this.hideSaveModal();
    this.hideDeleteModal();
    this.workflow.reset();
  }

  hasUnsavedChanges(): boolean { return this.dirty(); }
  isNavigationBlocked(): boolean { return this.workflow.busy() || this.committing() || this.deleting(); }
  discardChanges(): void {
    this.initialize(this.context.group(), this.workspace.defaultWeatherRange());
  }

  selectStation(station: WeatherStation): void {
    if (!this.canEdit()) return;
    const range = this.stationPreviewRange();
    if (!this.startMonth() && !this.endMonth() && range) {
      this.form.patchValue({ startMonth: toMonthInput(range.start), endMonth: toMonthInput(range.end) }, { emitEvent: false });
    }
    this.form.controls.station.setValue(station);
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
    const group = this.context.group();
    const readings = this.context.readings();
    const facility = this.workspace.facility();
    if (!facility) {
      this.committing.set(false);
      return;
    }
    try {
      const preview = await this.workflow.previewStationGroup(draft, group?.predictors ?? [], readings);
      if (!preview) return;
      this.preview.set(preview);
      this.saveModalOpen = true;
      this.modalPortal.show(new TemplatePortal(template, this.viewContainerRef));
    } catch (error) {
      this.saveError.set(error instanceof Error ? error.message : 'The weather station changes could not be prepared.');
    } finally {
      this.committing.set(false);
    }
  }

  async confirmSaveAndUpdateReadings(): Promise<void> {
    const preview = this.preview();
    const facility = this.workspace.facility();
    if (!preview || !facility || this.committing() || this.saveCompleted()) return;
    this.committing.set(true);
    this.saveError.set(undefined);
    try {
      await this.workflow.commitStationGroup(preview);
      this.markPristine();
      this.saveCompleted.set(true);
      this.postSaveRoute = preview.addPredictors.length + preview.updatePredictors.length === 0
        ? this.navigation.facilityInventoryLink(facility.guid, 'predictors')
        : { route: this.navigation.facilityWeatherPredictorRoute(facility.guid, `station:${preview.station.ID}`) };
    } catch (error) {
      this.saveError.set(error instanceof Error ? error.message : 'The weather station changes could not be saved.');
    } finally {
      this.committing.set(false);
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
      if (!preview) {
        this.deleteError.set(this.workflow.state().error || 'The weather station could not be deleted.');
        return;
      }
      await this.workflow.commitStationGroup(preview);
      this.markPristine();
      this.hideDeleteModal();
      await this.navigation.openFacilityInventory(facility.guid, 'predictors');
    } catch (error) {
      this.deleteError.set(error instanceof Error ? error.message : 'The weather station could not be deleted.');
    } finally {
      this.deleting.set(false);
    }
  }

  private initialize(group = this.context.group(), defaultRange = this.workspace.defaultWeatherRange()): void {
    const groupIds = new Set(group?.predictors.map(predictor => predictor.guid) ?? []);
    const groupRange = weatherRangeForReadings(
      this.workspace.predictorReadings().filter(reading => groupIds.has(reading.predictorId))
    );
    const range = groupRange ?? defaultRange;
    this.form.controls.definitions.clear({ emitEvent: false });
    const definitions: readonly EditableWeatherDefinition[] = group?.predictors.map(predictor => ({
      draftId: this.newDraftId(),
      predictorGuid: predictor.guid,
      weatherDataType: predictor.weatherDataType,
      name: predictor.name,
      unit: weatherPredictorUnit(predictor.weatherDataType),
      baseTemperature: predictor.weatherDataType === 'HDD'
        ? predictor.heatingBaseTemperature
        : predictor.weatherDataType === 'CDD' ? predictor.coolingBaseTemperature : undefined,
      production: !!predictor.production
    })) ?? [{
      draftId: this.newDraftId(), weatherDataType: 'HDD', name: defaultWeatherPredictorName('HDD', 60),
      unit: weatherPredictorUnit('HDD'), baseTemperature: 60, production: false
    }];
    for (const definition of definitions) {
      this.form.controls.definitions.push(this.buildDefinitionForm(definition), { emitEvent: false });
    }
    this.form.patchValue({
      station: group?.stationId ? { ID: group.stationId, name: group.stationName } as WeatherStation : null,
      startMonth: range ? toMonthInput(range.start) : '',
      endMonth: range ? toMonthInput(range.end) : ''
    }, { emitEvent: false });
    this.preview.set(undefined);
    this.saveCompleted.set(false);
    this.postSaveRoute = undefined;
    this.saveError.set(undefined);
    this.markPristine();
    if (!this.canEdit()) this.form.disable({ emitEvent: false });
    this.workflow.reset();
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

  private buildDefinitionForm(definition: EditableWeatherDefinition): WeatherDefinitionForm {
    return new FormGroup({
      draftId: new FormControl(definition.draftId, { nonNullable: true }),
      predictorGuid: new FormControl<string | null>(definition.predictorGuid ?? null),
      weatherDataType: new FormControl(definition.weatherDataType, { nonNullable: true }),
      name: new FormControl(definition.name, { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
      baseTemperature: new FormControl<number | null>(definition.baseTemperature ?? null),
      production: new FormControl(definition.production, { nonNullable: true })
    });
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
    this.formSnapshot.set(this.form.getRawValue());
  }
  private markChanged(): void { this.preview.set(undefined); this.saveCompleted.set(false); this.workflow.reset(); }
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
