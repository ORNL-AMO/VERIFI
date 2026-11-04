import { Injectable, inject } from '@angular/core';
import { deleteWorkspaceRecords, upsertWorkspaceRecords } from '@data/account-workspace/account-workspace-patches';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import {
  buildFacilityAnalysisPredictorUpdates,
  buildFacilityAnalysesWithoutPredictors,
  buildFacilityAnalysesWithPredictors
} from '@data/account-workspace/handlers/analysis-command-handler.service';
import { PredictorCommandHandler, PredictorDeletionPreview, predictorDeletionSnapshot } from '@data/account-workspace/handlers/predictor-command-handler.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { WorkspaceWriteError } from '@data/account-workspace/workspace-commands.models';
import { getNewIdbPredictor, IdbPredictor, isStandardPredictor } from '@data/models/idbModels/predictor';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import { getGUID } from '@shared/sharedHelperFunctions';
import { EditorConflictError, reconcileFields } from '@app/v1/data/editing/draft-reconciliation';
import { applyStandardPredictorSettings, normalizeStandardPredictorSettings, reconcileStandardPredictorSettings,
  StandardPredictorSettings, StandardPredictorSettingsIdentity, standardPredictorSettings,
  validStandardPredictorSettings } from './models/standard-predictor-settings.models';
import {
  PredictorDraft,
  PredictorMissingMonth,
  WeatherMaintenancePreview,
  WeatherPredictorGenerationPreview,
  WeatherStationGroupPreview,
  WeatherStationMonthChangeSet,
  createPredictorReading,
  findMissingPredictorMonths,
  isDegreeDayType,
  weatherStationRouteKey
} from './models';

@Injectable()
export class PredictorWorkspaceActionsService {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly workspaceService = inject(AccountWorkspaceService);
  private readonly commandBoundary = inject(WorkspaceCommandBoundary);
  private readonly predictorHandler = inject(PredictorCommandHandler);

  async createPredictor(draft: PredictorDraft, facilityGuid?: string): Promise<IdbPredictor> {
    const account = this.requireAccount();
    const facility = facilityGuid ? this.workspace.facilities().find(item => item.guid === facilityGuid && item.accountId === account.guid) : this.requireFacility();
    if (!facility) throw new WorkspaceWriteError('validation-failed', 'Select a facility in this account.');
    const predictor = this.predictorFromDraft(draft, account.guid, facility.guid);
    return this.executeWithRecovery(async () => {
      const result = await this.commandBoundary.execute(
        {
          entityKind: 'predictor', changeKind: 'add', entityGuid: predictor.guid,
          label: 'Adding predictor',
          notification: { successTitle: 'Predictor added', successMessage: predictor.name },
          publication: { mode: 'reload' }
        },
        () => this.predictorHandler.createStandardPredictor({
          predictor,
          facilityAnalyses: buildFacilityAnalysesWithPredictors(
            this.workspace.facilityAnalyses().filter(item => item.facilityId === predictor.facilityId),
            [predictor]
          )
        }, account.guid)
      );
      return result.value;
    });
  }

  async updatePredictor(updatedPredictor: IdbPredictor): Promise<IdbPredictor> {
    const account = this.requireAccount();
    const current = this.requirePredictor(updatedPredictor.guid);
    const updated = { ...structuredClone(updatedPredictor), id: current.id };
    if (updated.predictorType !== current.predictorType && !(isStandardPredictor(current) && updated.predictorType === 'Standard')) {
      throw new WorkspaceWriteError('validation-failed', 'Predictor type cannot be changed after creation.');
    }
    this.validatePredictor(updated);
    return this.executeWithRecovery(async () => {
      const result = await this.commandBoundary.execute(
        {
          entityKind: 'predictor', changeKind: 'update', entityGuid: updated.guid,
          label: 'Saving predictor settings',
          notification: { suppressSuccessToast: true },
          publication: { mode: 'reload' }
        },
        () => this.predictorHandler.updateStandardPredictor({
          predictor: updated,
          facilityAnalyses: buildFacilityAnalysisPredictorUpdates(
            this.facilityAnalyses(updated.facilityId),
            updated
          )
        }, account.guid)
      );
      return result.value;
    });
  }

  /** Resolve the current record only when this queued settings command executes. */
  async updateSettings(identity: StandardPredictorSettingsIdentity, value: StandardPredictorSettings,
    base: StandardPredictorSettings, ownerId: string): Promise<StandardPredictorSettings> {
    const submitted = normalizeStandardPredictorSettings(value);
    const baseline = normalizeStandardPredictorSettings(base);
    if (this.workspace.account()?.guid !== identity.accountGuid || !this.workspace.canWrite()) {
      throw new WorkspaceWriteError('stale-workspace', 'This predictor workspace is no longer available.');
    }
    if (!validStandardPredictorSettings(submitted)) {
      throw new WorkspaceWriteError('validation-failed', 'Resolve the predictor settings before saving.');
    }
    const result = await this.commandBoundary.execute({
      entityKind: 'predictor', changeKind: 'update', entityGuid: identity.predictorGuid,
      label: 'Saving predictor settings', ownerId,
      notification: { suppressSuccessToast: true }, publication: { mode: 'reload' }
    }, async () => {
      if (this.workspace.account()?.guid !== identity.accountGuid
        || this.workspace.selectedFacility()?.guid !== identity.facilityGuid
        || !this.workspace.facilities().some(facility => facility.guid === identity.facilityGuid
          && facility.accountId === identity.accountGuid)) {
        throw new WorkspaceWriteError('stale-workspace', 'This predictor workspace is no longer available.');
      }
      const current = this.workspace.predictors().find(predictor => predictor.guid === identity.predictorGuid
        && predictor.accountId === identity.accountGuid && predictor.facilityId === identity.facilityGuid);
      if (!current || !isStandardPredictor(current)) {
        throw new WorkspaceWriteError('stale-workspace', 'The Standard predictor is no longer available.');
      }
      const latest = standardPredictorSettings(current);
      const merged = reconcileStandardPredictorSettings(baseline, submitted, latest);
      if (merged.conflicts.length) throw new EditorConflictError(latest);
      const updated = applyStandardPredictorSettings(current, merged.value);
      const persisted = await this.predictorHandler.updateStandardPredictor({ predictor: updated,
        facilityAnalyses: buildFacilityAnalysisPredictorUpdates(this.facilityAnalyses(identity.facilityGuid), updated)
      }, identity.accountGuid);
      return standardPredictorSettings(persisted);
    });
    return result.value;
  }

  async copyPredictor(predictor: IdbPredictor, facilityGuid?: string): Promise<IdbPredictor> {
    const account = this.requireAccount();
    const current = this.requirePredictor(predictor.guid, facilityGuid);
    if (!isStandardPredictor(current)) throw new WorkspaceWriteError('validation-failed', 'Only standard predictors can be copied.');
    const copy = structuredClone(current);
    delete copy.id;
    if (isStandardPredictor(current)) copy.predictorType = 'Standard';
    copy.guid = getGUID();
    copy.name = `${copy.name || 'Untitled predictor'} (copy)`;
    return this.executeWithRecovery(async () => {
      const result = await this.commandBoundary.execute(
        {
          entityKind: 'predictor', changeKind: 'add', entityGuid: copy.guid,
          label: 'Copying predictor',
          notification: { successTitle: 'Predictor copied', successMessage: copy.name },
          publication: { mode: 'reload' }
        },
        () => this.predictorHandler.createStandardPredictor({
          predictor: copy,
          facilityAnalyses: buildFacilityAnalysesWithPredictors(
            this.facilityAnalyses(copy.facilityId),
            [copy]
          )
        }, account.guid)
      );
      return result.value;
    });
  }

  async deletePredictor(predictor: IdbPredictor): Promise<void> {
    const account = this.requireAccount();
    const current = this.requirePredictor(predictor.guid);
    if (current.id === undefined) {
      throw new WorkspaceWriteError('validation-failed', 'Predictor is missing its IndexedDB id.');
    }
    const readings = this.workspace.facilityPredictorData().filter(reading => reading.predictorId === current.guid);
    this.requireReadingIds(readings);
    await this.executeWithRecovery(async () => {
      await this.commandBoundary.execute(
        {
          entityKind: 'predictor', changeKind: 'delete', entityGuid: current.guid,
          label: 'Deleting predictor and readings',
          notification: { successTitle: 'Predictor deleted', successMessage: current.name },
          publication: { mode: 'reload' }
        },
        () => this.predictorHandler.deleteStandardPredictor({
          predictor: current,
          predictorData: readings,
          facilityAnalyses: buildFacilityAnalysesWithoutPredictors(
            this.facilityAnalyses(current.facilityId),
            new Set([current.guid])
          )
        }, account.guid)
      );
    });
  }

  previewDeletion(guids: readonly string[], facilityGuid?: string): PredictorDeletionPreview {
    this.requireAccount();
    const facility = facilityGuid ? this.workspace.facilities().find(item => item.guid === facilityGuid && item.accountId === this.workspace.account()?.guid) : this.requireFacility();
    if (!facility) throw new WorkspaceWriteError('validation-failed', 'Select a facility in this account.');
    const predictors = [...new Set(guids)].map(guid => this.requirePredictor(guid, facilityGuid));
    if (predictors.some(item => item.facilityId !== facility.guid || (!isStandardPredictor(item) && item.predictorType !== 'Weather'))) {
      throw new WorkspaceWriteError('validation-failed', 'Select standard or weather predictors from this facility.');
    }
    const selected = new Set(predictors.map(item => item.guid));
    return structuredClone({ facilityGuid: facility.guid, predictors,
      predictorData: this.workspace.predictorData().filter(item => selected.has(item.predictorId)),
      facilityAnalyses: this.facilityAnalyses(facility.guid) });
  }

  async deletePredictors(preview: PredictorDeletionPreview, facilityGuid?: string): Promise<void> {
    const account = this.requireAccount();
    const current = this.previewDeletion(preview.predictors.map(item => item.guid), facilityGuid);
    if (predictorDeletionSnapshot(current) !== predictorDeletionSnapshot(preview)) {
      throw new WorkspaceWriteError('stale-workspace', 'Predictor data changed. Review the deletion again.');
    }
    await this.commandBoundary.execute({ entityKind: 'predictor', changeKind: 'bulk', entityGuid: preview.facilityGuid,
      label: 'Deleting predictors and readings', publication: { mode: 'reload' },
      notification: { successTitle: 'Predictors deleted', successMessage: `${preview.predictors.length} predictors deleted` }
    }, () => this.predictorHandler.deletePredictorsWithData(preview, account.guid));
  }

  async addPredictorReading(reading: IdbPredictorData): Promise<IdbPredictorData> {
    const account = this.requireAccount();
    const predictor = this.requirePredictor(reading.predictorId);
    if (reading.accountId !== account.guid || reading.facilityId !== predictor.facilityId) {
      throw new WorkspaceWriteError('validation-failed', 'The predictor reading does not belong to the active facility.');
    }
    const newReading = structuredClone(reading);
    delete newReading.id;
    return this.executeWithRecovery(async () => {
      const result = await this.commandBoundary.execute(
        {
          entityKind: 'predictorData', changeKind: 'add', entityGuid: newReading.guid,
          label: 'Adding predictor reading',
          notification: { successTitle: 'Predictor reading added' },
          publication: { mode: 'patch', buildPatch: value => upsertWorkspaceRecords('predictorData', [value]) }
        },
        () => {
          const latestPredictor = this.requirePredictor(newReading.predictorId);
          this.assertCurrentReadingRequest(newReading, latestPredictor, account.guid);
          return this.predictorHandler.addPredictorData(newReading, account.guid);
        }
      );
      return result.value;
    });
  }

  async updatePredictorReading(reading: IdbPredictorData): Promise<IdbPredictorData> {
    const account = this.requireAccount();
    const current = this.requireReading(reading.guid, reading.predictorId);
    if (reading.accountId !== current.accountId || reading.facilityId !== current.facilityId) {
      throw new WorkspaceWriteError('validation-failed', 'The predictor reading does not belong to the active facility.');
    }
    const updated = { ...structuredClone(reading), id: current.id };
    const values = (item: IdbPredictorData) => ({ year: item.year, month: item.month, amount: item.amount, notes: item.notes ?? '' });
    return this.executeWithRecovery(async () => {
      const result = await this.commandBoundary.execute(
        {
          entityKind: 'predictorData', changeKind: 'update', entityGuid: updated.guid,
          label: 'Saving predictor reading',
          notification: { successTitle: 'Predictor reading saved' },
          publication: { mode: 'patch', buildPatch: value => upsertWorkspaceRecords('predictorData', [value]) }
        },
        () => {
          const latest = this.requireReading(updated.guid, updated.predictorId);
          const latestPredictor = this.requirePredictor(updated.predictorId);
          const merged = reconcileFields(values(current), values(updated), values(latest), {
            groups: [{ id: 'month', label: 'Month', keys: ['year', 'month'] }]
          });
          if (merged.conflicts.length) throw new EditorConflictError(values(latest));
          const mergedReading = { ...latest, ...merged.value };
          this.assertCurrentReadingRequest(mergedReading, latestPredictor, account.guid);
          return this.predictorHandler.updatePredictorData(mergedReading, account.guid);
        }
      );
      return result.value;
    });
  }

  async deletePredictorReading(reading: IdbPredictorData): Promise<void> {
    this.requireAccount();
    const current = this.requireReading(reading.guid, reading.predictorId);
    this.requireReadingIds([current]);
    await this.executeWithRecovery(async () => {
      await this.commandBoundary.execute(
        {
          entityKind: 'predictorData', changeKind: 'delete', entityGuid: current.guid,
          label: 'Deleting predictor reading',
          notification: { successTitle: 'Predictor reading deleted' },
          publication: { mode: 'patch', buildPatch: () => deleteWorkspaceRecords('predictorData', { ids: [current.id!] }) }
        },
        () => this.predictorHandler.deletePredictorData(current.id!)
      );
    });
  }

  async deletePredictorReadings(predictorGuid: string, readings: readonly IdbPredictorData[]): Promise<void> {
    const account = this.requireAccount();
    this.requirePredictor(predictorGuid);
    const selectedGuids = new Set(readings.map(reading => reading.guid));
    const current = this.workspace.facilityPredictorData()
      .filter(reading => reading.predictorId === predictorGuid && selectedGuids.has(reading.guid));
    this.requireReadingIds(current);
    if (current.length === 0) return;
    await this.executeWithRecovery(async () => {
      await this.commandBoundary.execute(
        {
          entityKind: 'predictorData', changeKind: 'bulk',
          label: 'Deleting predictor readings',
          notification: { successTitle: 'Predictor readings deleted' },
          publication: {
            mode: 'patch',
            buildPatch: () => deleteWorkspaceRecords('predictorData', { ids: current.map(reading => reading.id!) })
          }
        },
        () => this.predictorHandler.reconcilePredictorData(
          predictorGuid,
          { add: [], update: [], delete: current },
          account.guid
        )
      );
    });
  }

  async fillMissingPredictorMonths(
    predictorGuid: string,
    requestedMonths: readonly PredictorMissingMonth[]
  ): Promise<readonly IdbPredictorData[]> {
    const account = this.requireAccount();
    const predictor = this.requirePredictor(predictorGuid);
    const currentReadings = this.workspace.facilityPredictorData()
      .filter(reading => reading.predictorId === predictorGuid);
    const requestedKeys = new Set(requestedMonths.map(month => month.key));
    const currentMissing = findMissingPredictorMonths(currentReadings).filter(month => requestedKeys.has(month.key));
    if (currentMissing.length === 0) return [];
    const additions = currentMissing.map(month => {
      const reading = createPredictorReading(predictor, currentReadings, month);
      reading.amount = 0;
      return reading;
    });
    return this.executeWithRecovery(async () => {
      const result = await this.commandBoundary.execute(
        {
          entityKind: 'predictorData', changeKind: 'bulk',
          label: 'Filling missing predictor months',
          notification: { successTitle: 'Missing predictor months filled' },
          // The atomic handler does not return generated IndexedDB ids for additions,
          // so a committed reload is required to publish complete persisted records.
          publication: { mode: 'reload' }
        },
        async () => {
          await this.predictorHandler.reconcilePredictorData(
            predictorGuid,
            { add: additions, update: [], delete: [] },
            account.guid
          );
          return additions;
        }
      );
      return result.value;
    });
  }

  async createWeatherPredictors(preview: WeatherPredictorGenerationPreview): Promise<void> {
    const account = this.requireAccount();
    const facility = this.requireFacility();
    this.requireCurrentRevision(preview.workspaceRevision);
    if (preview.predictors.length === 0) {
      throw new WorkspaceWriteError('validation-failed', 'Select at least one weather predictor to create.');
    }
    if (preview.predictors.some(predictor => predictor.accountId !== account.guid
      || predictor.facilityId !== facility.guid || predictor.predictorType !== 'Weather')) {
      throw new WorkspaceWriteError('validation-failed', 'The generated predictors do not belong to the active facility.');
    }
    const analyses = buildFacilityAnalysesWithPredictors(
      this.workspace.facilityAnalyses().filter(analysis => analysis.facilityId === facility.guid),
      preview.predictors
    );
    await this.executeWithRecovery(async () => {
      await this.commandBoundary.execute(
        {
          entityKind: 'predictor', changeKind: 'bulk',
          label: 'Creating weather predictors',
          notification: { successTitle: 'Weather predictors created' },
          publication: { mode: 'reload' }
        },
        () => this.predictorHandler.createWeatherPredictors({
          predictors: preview.predictors,
          predictorData: preview.readings,
          facilityAnalyses: analyses
        }, account.guid)
      );
    });
  }

  async applyWeatherMaintenance(preview: WeatherMaintenancePreview): Promise<void> {
    const account = this.requireAccount();
    this.requireCurrentRevision(preview.workspaceRevision);
    this.requirePredictor(preview.predictorGuid);
    await this.executeWithRecovery(async () => {
      await this.commandBoundary.execute(
        {
          entityKind: 'predictorData', changeKind: 'bulk', entityGuid: preview.predictorGuid,
          label: preview.mode === 'restore' ? 'Restoring calculated weather reading' : 'Updating calculated weather readings',
          notification: {
            successTitle: preview.mode === 'restore' ? 'Calculated weather reading restored' : 'Weather readings updated'
          },
          publication: { mode: 'reload' }
        },
        () => this.predictorHandler.reconcilePredictorData(
          preview.predictorGuid,
          { add: preview.add, update: preview.update, delete: preview.delete },
          account.guid
        )
      );
    });
  }

  async applyWeatherSettings(preview: WeatherMaintenancePreview): Promise<void> {
    const account = this.requireAccount();
    this.requireCurrentRevision(preview.workspaceRevision);
    const current = this.requirePredictor(preview.predictorGuid);
    const proposed = { ...structuredClone(preview.proposedPredictor), id: current.id };
    this.validatePredictor(proposed);
    const analyses = buildFacilityAnalysisPredictorUpdates(
      this.workspace.facilityAnalyses().filter(analysis => analysis.facilityId === proposed.facilityId),
      proposed
    );
    await this.executeWithRecovery(async () => {
      await this.commandBoundary.execute(
        {
          entityKind: 'predictor', changeKind: 'bulk', entityGuid: proposed.guid,
          label: 'Saving weather settings and recalculated readings',
          notification: { successTitle: 'Weather settings updated' },
          publication: { mode: 'reload' }
        },
        () => this.predictorHandler.updateWeatherPredictor({
          predictor: proposed,
          predictorData: { add: preview.add, update: preview.update, delete: preview.delete },
          facilityAnalyses: analyses
        }, account.guid)
      );
    });
  }

  async applyWeatherStationGroup(preview: WeatherStationGroupPreview): Promise<void> {
    const account = this.requireAccount();
    const facility = this.requireFacility();
    const submitted = structuredClone(preview);
    this.validateWeatherStationGroup(submitted, account.guid, facility.guid);

    await this.executeWithRecovery(async () => {
      await this.commandBoundary.execute(
        {
          entityKind: 'predictor', changeKind: 'bulk',
          label: 'Saving weather station predictors',
          notification: {
            successTitle: submitted.updatePredictors.length || submitted.deletePredictors.length
              ? 'Weather station updated' : 'Weather predictors created'
          },
          publication: { mode: 'reload' }
        },
        () => {
          const sourceWeatherStationId = this.validateWeatherStationGroup(submitted, account.guid, facility.guid);
          return this.predictorHandler.applyWeatherStationGroup({
            facilityId: facility.guid,
            weatherStationId: submitted.station.ID,
            sourceWeatherStationId,
            addPredictors: submitted.addPredictors,
            updatePredictors: submitted.updatePredictors,
            deletePredictors: submitted.deletePredictors,
            predictorData: {
              add: submitted.addReadings,
              update: submitted.updateReadings,
              delete: submitted.deleteReadings
            },
            facilityAnalyses: submitted.facilityAnalyses
          }, account.guid);
        }
      );
    });
  }

  async applyWeatherStationMonth(changes: WeatherStationMonthChangeSet): Promise<void> {
    const account = this.requireAccount();
    const facility = this.requireFacility();
    const submitted = structuredClone(changes);
    this.validateWeatherStationMonth(submitted, account.guid, facility.guid);

    await this.commandBoundary.execute(
      {
        entityKind: 'predictorData', changeKind: 'bulk',
        label: submitted.delete.length && !submitted.add.length && !submitted.update.length
          ? 'Deleting weather station month' : 'Saving weather station month',
        notification: { suppressSuccessToast: true },
        publication: { mode: 'reload' }
      },
      () => {
        this.validateWeatherStationMonth(submitted, account.guid, facility.guid);
        return this.predictorHandler.applyWeatherStationMonth({
          facilityId: facility.guid,
          predictorGuids: submitted.predictorGuids,
          year: submitted.year,
          month: submitted.month,
          add: submitted.add,
          update: submitted.update,
          delete: submitted.delete
        }, account.guid);
      }
    );
  }

  private assertWeatherCommandScope(accountGuid: string, facilityGuid: string, revision: number): void {
    this.requireCurrentRevision(revision);
    if (!this.workspace.canWrite() || this.workspace.account()?.guid !== accountGuid
      || this.workspace.selectedFacility()?.guid !== facilityGuid
      || !this.workspace.facilities().some(facility => facility.guid === facilityGuid && facility.accountId === accountGuid)) {
      throw new WorkspaceWriteError('stale-workspace', 'This weather predictor workspace is no longer available.');
    }
  }

  private validateWeatherStationGroup(preview: WeatherStationGroupPreview, accountGuid: string,
    facilityGuid: string): string | undefined {
    this.assertWeatherCommandScope(accountGuid, facilityGuid, preview.workspaceRevision);
    const currentPredictors = this.workspace.predictors().filter(predictor =>
      predictor.accountId === accountGuid && predictor.facilityId === facilityGuid);
    const changed = [...preview.updatePredictors, ...preview.deletePredictors];
    const changedIds = new Set(changed.map(predictor => predictor.guid));
    const sourceStationIds = new Set<string | undefined>();
    const sourceGroupKeys = new Set<string>();
    for (const predictor of changed) {
      const current = currentPredictors.find(item => item.guid === predictor.guid);
      if (!current || current.id !== predictor.id || current.predictorType !== 'Weather'
        || predictor.accountId !== accountGuid || predictor.facilityId !== facilityGuid) {
        throw new WorkspaceWriteError('stale-workspace', 'The weather station group is no longer available.');
      }
      sourceStationIds.add(current.weatherStationId);
      sourceGroupKeys.add(weatherStationRouteKey(current));
    }
    const sourceGroupKey = preview.sourceGroupKey ?? sourceGroupKeys.values().next().value;
    const sourcePredictors = currentPredictors.filter(predictor => predictor.predictorType === 'Weather'
      && weatherStationRouteKey(predictor) === sourceGroupKey);
    if (changedIds.size !== changed.length || sourceGroupKeys.size > 1
      || (preview.sourceGroupKey && sourceGroupKeys.size && !sourceGroupKeys.has(preview.sourceGroupKey))
      || (sourceGroupKey && (sourcePredictors.length !== changedIds.size
        || sourcePredictors.some(predictor => !changedIds.has(predictor.guid))))) {
      throw new WorkspaceWriteError('stale-workspace', 'The weather station predictors changed. Review the latest setup and try again.');
    }
    if (currentPredictors.some(predictor => predictor.predictorType === 'Weather'
      && predictor.weatherStationId === preview.station.ID && !changedIds.has(predictor.guid))) {
      throw new WorkspaceWriteError('validation-failed', 'That weather station already has a workbench. Open the existing station instead.');
    }
    if ([...preview.addPredictors, ...preview.updatePredictors].some(predictor =>
      predictor.accountId !== accountGuid || predictor.facilityId !== facilityGuid
      || predictor.predictorType !== 'Weather' || predictor.weatherStationId !== preview.station.ID)
      || preview.addPredictors.some(predictor => this.workspace.predictors().some(current => current.guid === predictor.guid))) {
      throw new WorkspaceWriteError('validation-failed', 'The reviewed weather predictors do not belong to this station.');
    }
    const groupIds = new Set([...changedIds, ...preview.addPredictors.map(predictor => predictor.guid)]);
    const currentReadings = new Map(this.workspace.predictorData().map(reading => [reading.guid, reading]));
    for (const reading of [...preview.updateReadings, ...preview.deleteReadings]) {
      const current = currentReadings.get(reading.guid);
      if (!current || current.id !== reading.id || current.predictorId !== reading.predictorId
        || current.accountId !== accountGuid || current.facilityId !== facilityGuid
        || reading.accountId !== accountGuid || reading.facilityId !== facilityGuid || !changedIds.has(reading.predictorId)) {
        throw new WorkspaceWriteError('stale-workspace', 'The weather readings changed. Review the latest setup and try again.');
      }
    }
    if (preview.addReadings.some(reading => reading.accountId !== accountGuid || reading.facilityId !== facilityGuid
      || !groupIds.has(reading.predictorId) || currentReadings.has(reading.guid))) {
      throw new WorkspaceWriteError('validation-failed', 'A new weather reading is outside this station group.');
    }
    if (preview.facilityAnalyses.some(analysis => analysis.accountId !== accountGuid || analysis.facilityId !== facilityGuid
      || !this.workspace.facilityAnalyses().some(current => current.guid === analysis.guid && current.id === analysis.id
        && current.accountId === accountGuid && current.facilityId === facilityGuid))) {
      throw new WorkspaceWriteError('stale-workspace', 'The reviewed analysis changes are no longer available in this facility.');
    }
    return sourceStationIds.values().next().value;
  }

  private validateWeatherStationMonth(changes: WeatherStationMonthChangeSet, accountGuid: string, facilityGuid: string): void {
    this.assertWeatherCommandScope(accountGuid, facilityGuid, changes.workspaceRevision);
    const groupPredictors = this.workspace.predictors().filter(predictor => predictor.accountId === accountGuid
      && predictor.facilityId === facilityGuid && predictor.predictorType === 'Weather'
      && weatherStationRouteKey(predictor) === changes.groupKey);
    const currentGuids = new Set(groupPredictors.map(predictor => predictor.guid));
    if (!currentGuids.size || currentGuids.size !== changes.predictorGuids.length
      || changes.predictorGuids.some(guid => !currentGuids.has(guid))) {
      throw new WorkspaceWriteError('stale-workspace', 'The weather station predictors changed. Review the latest readings and try again.');
    }
    const currentRecords = new Map(this.workspace.predictorData().map(reading => [reading.guid, reading]));
    const currentMonthRecords = this.workspace.predictorData().filter(reading => currentGuids.has(reading.predictorId)
      && reading.accountId === accountGuid && reading.facilityId === facilityGuid
      && reading.year === changes.year && reading.month === changes.month);
    for (const reading of [...changes.update, ...changes.delete]) {
      const current = currentRecords.get(reading.guid);
      if (!current || current.id !== reading.id || current.predictorId !== reading.predictorId
        || current.accountId !== accountGuid || current.facilityId !== facilityGuid
        || reading.accountId !== accountGuid || reading.facilityId !== facilityGuid
        || current.year !== changes.year || current.month !== changes.month
        || reading.year !== changes.year || reading.month !== changes.month || !currentGuids.has(reading.predictorId)) {
        throw new WorkspaceWriteError('stale-workspace', 'The weather readings changed. Review the latest month and try again.');
      }
    }
    const addedPredictorIds = new Set<string>();
    for (const reading of changes.add) {
      if (reading.accountId !== accountGuid || reading.facilityId !== facilityGuid || currentRecords.has(reading.guid)
        || !currentGuids.has(reading.predictorId) || reading.year !== changes.year || reading.month !== changes.month
        || addedPredictorIds.has(reading.predictorId)
        || currentMonthRecords.some(current => current.predictorId === reading.predictorId)) {
        throw new WorkspaceWriteError('validation-failed', 'A new reading is outside this weather station month.');
      }
      addedPredictorIds.add(reading.predictorId);
    }
  }

  private predictorFromDraft(draft: PredictorDraft, accountGuid: string, facilityGuid: string): IdbPredictor {
    const predictor = getNewIdbPredictor(accountGuid, facilityGuid);
    predictor.name = this.requireName(draft.name);
    predictor.production = draft.production;
    predictor.productionInAnalysis = draft.production;
    predictor.predictorType = draft.predictorType;
    predictor.unit = this.cleanText(draft.unit);
    predictor.canBeNegative = false;
    predictor.ignoreDateStatusChecks = false;
    predictor.noLongerInUse = false;
    if (draft.predictorType === 'Weather') {
      if (!draft.weatherStation || !draft.weatherDataType) {
        throw new WorkspaceWriteError('validation-failed', 'Select a weather station and weather data type.');
      }
      if (isDegreeDayType(draft.weatherDataType) && !Number.isFinite(draft.baseTemperature)) {
        throw new WorkspaceWriteError('validation-failed', 'Enter a base temperature for the degree-day predictor.');
      }
      predictor.weatherStationId = draft.weatherStation.ID;
      predictor.weatherStationName = draft.weatherStation.name;
      predictor.weatherDataType = draft.weatherDataType;
      if (draft.weatherDataType === 'HDD') predictor.heatingBaseTemperature = draft.baseTemperature;
      if (draft.weatherDataType === 'CDD') predictor.coolingBaseTemperature = draft.baseTemperature;
    }
    return predictor;
  }

  private validatePredictor(predictor: IdbPredictor): void {
    predictor.name = this.requireName(predictor.name);
    if (predictor.predictorType === 'Weather') {
      if (!predictor.weatherStationId || !predictor.weatherStationName) {
        throw new WorkspaceWriteError('validation-failed', 'Select a weather station.');
      }
      const base = predictor.weatherDataType === 'HDD'
        ? predictor.heatingBaseTemperature
        : predictor.weatherDataType === 'CDD' ? predictor.coolingBaseTemperature : 0;
      if (isDegreeDayType(predictor.weatherDataType) && !Number.isFinite(base)) {
        throw new WorkspaceWriteError('validation-failed', 'Enter the applicable base temperature.');
      }
    }
  }

  private requirePredictor(guid: string, facilityGuid?: string): IdbPredictor {
    const candidates = facilityGuid ? this.workspace.predictors() : this.workspace.facilityPredictors();
    const predictor = candidates.find(item => item.guid === guid && (!facilityGuid ||
      (item.facilityId === facilityGuid && item.accountId === this.workspace.account()?.guid &&
        this.workspace.facilities().some(facility => facility.guid === facilityGuid && facility.accountId === item.accountId))));
    if (!predictor) {
      throw new WorkspaceWriteError('validation-failed', 'The predictor is not part of the selected facility.');
    }
    return structuredClone(predictor);
  }

  private requireReading(guid: string, predictorGuid: string): IdbPredictorData {
    this.requirePredictor(predictorGuid);
    const reading = this.workspace.facilityPredictorData()
      .find(item => item.guid === guid && item.predictorId === predictorGuid);
    if (!reading) throw new WorkspaceWriteError('validation-failed', 'The predictor reading is no longer available.');
    return structuredClone(reading);
  }

  private assertCurrentReadingRequest(reading: IdbPredictorData, predictor: IdbPredictor, accountGuid: string): void {
    if (this.workspace.account()?.guid !== accountGuid || predictor.accountId !== accountGuid
      || !isStandardPredictor(predictor) || reading.accountId !== accountGuid || reading.facilityId !== predictor.facilityId
      || !Number.isInteger(reading.year) || reading.year < 1 || !Number.isInteger(reading.month)
      || reading.month < 1 || reading.month > 12 || !Number.isFinite(reading.amount)
      || (!predictor.canBeNegative && reading.amount < 0)) {
      throw new WorkspaceWriteError('validation-failed', 'The predictor reading is no longer valid in this workspace.');
    }
    if (this.workspace.facilityPredictorData().some(candidate => candidate.predictorId === predictor.guid
      && candidate.guid !== reading.guid && candidate.year === reading.year && candidate.month === reading.month)) {
      throw new WorkspaceWriteError('validation-failed', 'A predictor reading already exists for this month.');
    }
  }

  private facilityAnalyses(facilityGuid: string) {
    return this.workspace.facilityAnalyses().filter(analysis => analysis.facilityId === facilityGuid);
  }

  private requireAccount() {
    const account = this.workspace.account();
    if (!account || !this.workspace.canWrite() || this.workspace.hasPending()) {
      throw new WorkspaceWriteError('workspace-not-ready', 'The workspace is not ready for predictor changes.');
    }
    return account;
  }

  private requireFacility() {
    const facility = this.workspace.selectedFacility();
    if (!facility) throw new WorkspaceWriteError('workspace-not-ready', 'Select a facility before changing predictors.');
    return facility;
  }

  private requireName(name: string): string {
    const trimmed = name?.trim();
    if (!trimmed) throw new WorkspaceWriteError('validation-failed', 'Predictor name is required.');
    if (trimmed.length > 100) throw new WorkspaceWriteError('validation-failed', 'Predictor name must be 100 characters or fewer.');
    return trimmed;
  }

  private cleanText(value: string | undefined): string | undefined {
    const trimmed = value?.trim();
    return trimmed || undefined;
  }

  private requireReadingIds(readings: readonly IdbPredictorData[]): void {
    if (readings.some(reading => reading.id === undefined)) {
      throw new WorkspaceWriteError('validation-failed', 'One or more predictor readings are missing their IndexedDB id.');
    }
  }

  private requireCurrentRevision(revision: number): void {
    if (this.workspace.revision() !== revision) {
      throw new WorkspaceWriteError(
        'stale-workspace',
        'Predictor data changed after this preview was generated. Review the latest data and generate a new preview.'
      );
    }
  }

  private async executeWithRecovery<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      try {
        await this.workspaceService.reloadActiveWorkspace(true);
      } catch {
        // The original command error remains the most useful error for the caller.
      }
      throw error;
    }
  }
}
