import { Injectable, inject } from '@angular/core';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AnalysisCommandHandler } from '@data/account-workspace/handlers/analysis-command-handler.service';
import { PredictorCommandHandler } from '@data/account-workspace/handlers/predictor-command-handler.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { WorkspaceWriteError } from '@data/account-workspace/workspace-commands.models';
import { getNewIdbPredictor, IdbPredictor } from '@data/models/idbModels/predictor';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import { getGUID } from '@shared/sharedHelperFunctions';
import { PredictorDraft, isDegreeDayType } from './models';

@Injectable()
export class PredictorWorkspaceActionsService {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly workspaceService = inject(AccountWorkspaceService);
  private readonly commandBoundary = inject(WorkspaceCommandBoundary);
  private readonly predictorHandler = inject(PredictorCommandHandler);
  private readonly analysisHandler = inject(AnalysisCommandHandler);

  async createPredictor(draft: PredictorDraft): Promise<IdbPredictor> {
    const account = this.requireAccount();
    const facility = this.requireFacility();
    const predictor = this.predictorFromDraft(draft, account.guid, facility.guid);
    return this.executeWithRecovery(async () => {
      const result = await this.commandBoundary.execute(
        {
          entityKind: 'predictor', changeKind: 'add', entityGuid: predictor.guid,
          label: 'Adding predictor',
          notification: { successTitle: 'Predictor added', successMessage: predictor.name },
          publication: { mode: 'reload' }
        },
        async () => {
          const added = await this.predictorHandler.addPredictor(predictor, account.guid);
          await this.analysisHandler.addAnalysisPredictor(added);
          return added;
        }
      );
      return result.value;
    });
  }

  async updatePredictor(updatedPredictor: IdbPredictor): Promise<IdbPredictor> {
    const account = this.requireAccount();
    const current = this.requirePredictor(updatedPredictor.guid);
    const updated = { ...structuredClone(updatedPredictor), id: current.id };
    this.validatePredictor(updated);
    return this.executeWithRecovery(async () => {
      const result = await this.commandBoundary.execute(
        {
          entityKind: 'predictor', changeKind: 'update', entityGuid: updated.guid,
          label: 'Saving predictor settings',
          notification: { suppressSuccessToast: true },
          publication: { mode: 'reload' }
        },
        async () => {
          const saved = await this.predictorHandler.updatePredictor(updated, account.guid);
          await this.analysisHandler.updateAnalysisPredictor(saved);
          return saved;
        }
      );
      return result.value;
    });
  }

  async copyPredictor(predictor: IdbPredictor): Promise<IdbPredictor> {
    const account = this.requireAccount();
    const current = this.requirePredictor(predictor.guid);
    const copy = structuredClone(current);
    delete copy.id;
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
        async () => {
          const added = await this.predictorHandler.addPredictor(copy, account.guid);
          await this.analysisHandler.addAnalysisPredictor(added);
          return added;
        }
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
    const readings = this.workspace.predictorData().filter(reading => reading.predictorId === current.guid);
    this.requireReadingIds(readings);
    await this.executeWithRecovery(async () => {
      await this.commandBoundary.execute(
        {
          entityKind: 'predictor', changeKind: 'delete', entityGuid: current.guid,
          label: 'Deleting predictor and readings',
          notification: { successTitle: 'Predictor deleted', successMessage: current.name },
          publication: { mode: 'reload' }
        },
        async () => {
          for (const reading of readings) {
            await this.predictorHandler.deletePredictorData(reading.id!);
          }
          await this.analysisHandler.deleteAnalysisPredictor(current);
          await this.predictorHandler.deletePredictor(current, account.guid);
        }
      );
    });
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

  private requirePredictor(guid: string): IdbPredictor {
    const predictor = this.workspace.predictors().find(item => item.guid === guid);
    if (!predictor) throw new WorkspaceWriteError('validation-failed', 'The predictor is no longer available.');
    return structuredClone(predictor);
  }

  private requireAccount() {
    const account = this.workspace.account();
    if (!account) throw new WorkspaceWriteError('workspace-not-ready', 'Select an account before changing predictors.');
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
