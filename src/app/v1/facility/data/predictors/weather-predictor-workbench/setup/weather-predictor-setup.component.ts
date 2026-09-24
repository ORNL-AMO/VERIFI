import { TemplatePortal } from '@angular/cdk/portal';
import { Component, OnDestroy, TemplateRef, ViewChild, ViewContainerRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { WeatherStation } from '@data/models/degreeDays';
import { WeatherDataType } from '@data/models/idbModels/predictor';
import { getWeatherSearchFromFacility } from '@shared/sharedHelperFunctions';
import { HasUnsavedChanges } from '@app/v1/account/data/unsaved-changes.guard';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { WeatherMonthRange } from '@platform/weather/hourly-weather-data.models';
import { FacilityPredictorsWorkspaceService } from '../../facility-predictors-workspace.service';
import {
  WEATHER_DATA_TYPE_OPTIONS,
  WeatherStationGroupDefinition,
  WeatherStationGroupDraft,
  WeatherStationGroupPreview,
  defaultWeatherPredictorName,
  validateWeatherMonthRange,
  weatherPredictorUnit,
  weatherRangeForReadings
} from '../../models';
import { PredictorWeatherWorkflowService } from '../../predictor-weather-workflow.service';
import { WeatherStationSelectorComponent } from '../../shared/weather-station-selector/weather-station-selector.component';

interface EditableWeatherDefinition extends WeatherStationGroupDefinition {
  readonly draftId: string;
}

@Component({
  selector: 'app-weather-predictor-setup',
  templateUrl: './weather-predictor-setup.component.html',
  styleUrls: ['./weather-predictor-setup.component.css'],
  standalone: true,
  imports: [IconComponent, WeatherStationSelectorComponent]
})
export class WeatherPredictorSetupComponent implements HasUnsavedChanges, OnDestroy {
  private readonly router = inject(Router);
  private readonly unsavedChanges = inject(UnsavedChangesService);
  private readonly modalPortal = inject(ModalPortalService);
  private readonly viewContainerRef = inject(ViewContainerRef);
  readonly workspace = inject(FacilityPredictorsWorkspaceService);
  readonly workflow = inject(PredictorWeatherWorkflowService);
  readonly navigation = inject(WorkspaceNavigationService);

  readonly weatherTypes = WEATHER_DATA_TYPE_OPTIONS;
  readonly station = signal<WeatherStation | undefined>(undefined);
  readonly startMonth = signal('');
  readonly endMonth = signal('');
  readonly definitions = signal<readonly EditableWeatherDefinition[]>([]);
  readonly stationPreviewRange = computed(() => rangeFromInputs(this.startMonth(), this.endMonth()));
  readonly preview = signal<WeatherStationGroupPreview | undefined>(undefined);
  readonly dirty = signal(false);
  readonly saveError = signal<string | undefined>(undefined);
  readonly committing = signal(false);
  readonly saveCompleted = signal(false);
  readonly deleting = signal(false);
  readonly deleteError = signal<string | undefined>(undefined);
  readonly initialStationSearch = computed(() => {
    const facility = this.workspace.facility();
    return facility ? getWeatherSearchFromFacility(facility) : '';
  });
  readonly isCreation = this.workspace.creatingWeatherGroup;
  readonly canSubmit = computed(() => {
    const station = this.station();
    const range = this.stationPreviewRange();
    const definitions = this.definitions();
    return !!station
      && (!!this.workspace.selectedWeatherGroup() || definitions.length > 0)
      && definitions.every(definition => definition.name.trim().length > 0
        && definition.name.trim().length <= 100
        && (!isDegreeDay(definition.weatherDataType) || Number.isFinite(definition.baseTemperature)))
      && !!range && !validateWeatherMonthRange(range)
      && this.dirty()
      && this.workspace.canWrite()
      && !this.workflow.busy() && !this.committing() && !this.deleting();
  });
  readonly canDelete = computed(() => !!this.workspace.selectedWeatherGroup()
    && this.workspace.canWrite()
    && !this.workspace.hasPending()
    && !this.committing()
    && !this.deleting());

  private initializedContext: string | undefined;
  private nextDraftId = 0;
  private deleteModalOpen = false;
  private saveModalOpen = false;
  private postSaveRoute: string[] | undefined;
  @ViewChild('saveChangesConfirmModal') private readonly saveChangesConfirmModal?: TemplateRef<unknown>;
  @ViewChild('deleteStationConfirmModal') private readonly deleteStationConfirmModal?: TemplateRef<unknown>;
  private readonly unregisterUnsavedChanges = this.unsavedChanges.register(
    () => this.hasUnsavedChanges(),
    () => this.discardChanges(),
    () => this.isNavigationBlocked()
  );
  private readonly initializeEffect = effect(() => {
    const group = this.workspace.selectedWeatherGroup();
    const creation = this.workspace.creatingWeatherGroup();
    const defaultRange = this.workspace.defaultWeatherRange();
    const context = creation ? 'new' : group?.routeKey;
    if (!context || context === this.initializedContext) return;
    untracked(() => this.initialize(group, defaultRange));
    this.initializedContext = context;
  });

  ngOnDestroy(): void {
    this.unregisterUnsavedChanges();
    this.hideSaveModal();
    this.hideDeleteModal();
    this.workflow.reset();
  }

  hasUnsavedChanges(): boolean { return this.dirty(); }
  isNavigationBlocked(): boolean { return this.workflow.busy() || this.committing() || this.deleting(); }
  discardChanges(): void {
    this.initialize(this.workspace.selectedWeatherGroup(), this.workspace.defaultWeatherRange());
  }

  selectStation(station: WeatherStation): void { this.station.set(station); this.markChanged(); }
  setStartMonth(value: string): void { this.startMonth.set(value); this.markChanged(); }
  setEndMonth(value: string): void { this.endMonth.set(value); this.markChanged(); }

  addDefinition(type: WeatherDataType = 'HDD'): void {
    const baseTemperature = isDegreeDay(type) ? 60 : undefined;
    this.definitions.update(definitions => [...definitions, {
      draftId: this.newDraftId(),
      weatherDataType: type,
      name: defaultWeatherPredictorName(type, baseTemperature),
      baseTemperature,
      production: false
    }]);
    this.markChanged();
  }

  removeDefinition(draftId: string): void {
    this.definitions.update(definitions => definitions.filter(definition => definition.draftId !== draftId));
    this.markChanged();
  }

  setDefinitionType(draftId: string, value: string): void {
    const type = value as WeatherDataType;
    const current = this.definitions().find(definition => definition.draftId === draftId);
    if (!current) return;
    const previousDefault = defaultWeatherPredictorName(current.weatherDataType, current.baseTemperature);
    const baseTemperature = isDegreeDay(type) ? 60 : undefined;
    this.updateDefinition(draftId, {
      weatherDataType: type,
      baseTemperature,
      unit: weatherPredictorUnit(type),
      name: current.name === previousDefault ? defaultWeatherPredictorName(type, baseTemperature) : current.name
    });
  }
  setDefinitionName(draftId: string, name: string): void { this.updateDefinition(draftId, { name }); }
  setDefinitionBase(draftId: string, value: string): void {
    const current = this.definitions().find(definition => definition.draftId === draftId);
    if (!current) return;
    const nextBase = value === '' ? undefined : Number(value);
    const previousDefault = defaultWeatherPredictorName(current.weatherDataType, current.baseTemperature);
    this.updateDefinition(draftId, {
      baseTemperature: nextBase,
      name: current.name === previousDefault
        ? defaultWeatherPredictorName(current.weatherDataType, nextBase)
        : current.name
    });
  }

  unitFor(type: WeatherDataType): string { return weatherPredictorUnit(type); }

  async saveAndUpdateReadings(): Promise<void> {
    const draft = this.buildDraft();
    const template = this.saveChangesConfirmModal;
    if (!draft || !template || !this.canSubmit()) return;
    this.preview.set(undefined);
    this.saveCompleted.set(false);
    this.postSaveRoute = undefined;
    this.saveError.set(undefined);
    this.committing.set(true);
    const group = this.workspace.selectedWeatherGroup();
    const currentIds = new Set(group?.predictors.map(predictor => predictor.guid) ?? []);
    const readings = this.workspace.predictorReadings().filter(reading => currentIds.has(reading.predictorId));
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
      this.dirty.set(false);
      this.saveCompleted.set(true);
      this.postSaveRoute = preview.addPredictors.length + preview.updatePredictors.length === 0
        ? this.navigation.facilityDataRoute(facility.guid, 'predictors')
        : this.navigation.facilityWeatherPredictorRoute(facility.guid, `station:${preview.station.ID}`);
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
      void this.router.navigate(route);
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
    const group = this.workspace.selectedWeatherGroup();
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
      this.dirty.set(false);
      this.hideDeleteModal();
      await this.router.navigate(this.navigation.facilityDataRoute(facility.guid, 'predictors'));
    } catch (error) {
      this.deleteError.set(error instanceof Error ? error.message : 'The weather station could not be deleted.');
    } finally {
      this.deleting.set(false);
    }
  }

  private initialize(group = this.workspace.selectedWeatherGroup(), defaultRange = this.workspace.defaultWeatherRange()): void {
    const groupIds = new Set(group?.predictors.map(predictor => predictor.guid) ?? []);
    const groupRange = weatherRangeForReadings(
      this.workspace.predictorReadings().filter(reading => groupIds.has(reading.predictorId))
    );
    const range = groupRange ?? defaultRange;
    this.station.set(group?.stationId ? { ID: group.stationId, name: group.stationName } as WeatherStation : undefined);
    this.startMonth.set(range ? toMonthInput(range.start) : '');
    this.endMonth.set(range ? toMonthInput(range.end) : '');
    this.definitions.set(group?.predictors.map(predictor => ({
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
      baseTemperature: 60, production: false
    }]);
    this.preview.set(undefined);
    this.saveCompleted.set(false);
    this.postSaveRoute = undefined;
    this.saveError.set(undefined);
    this.dirty.set(false);
    this.workflow.reset();
  }

  private buildDraft(): WeatherStationGroupDraft | undefined {
    const station = this.station();
    const range = rangeFromInputs(this.startMonth(), this.endMonth());
    if (!station || !range) return undefined;
    return {
      sourceGroupKey: this.workspace.selectedWeatherGroup()?.routeKey,
      station,
      range,
      definitions: this.definitions().map(({ draftId: _draftId, ...definition }) => definition)
    };
  }

  private updateDefinition(draftId: string, update: Partial<EditableWeatherDefinition>): void {
    this.definitions.update(definitions => definitions.map(definition =>
      definition.draftId === draftId ? { ...definition, ...update } : definition));
    this.markChanged();
  }
  private markChanged(): void { this.dirty.set(true); this.preview.set(undefined); this.saveCompleted.set(false); this.workflow.reset(); }
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
