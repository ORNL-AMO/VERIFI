import { DestroyRef, Injector, computed, effect, inject, signal, untracked } from '@angular/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import {
  MeterCommandHandler, MeterDeletionChanges
} from '@data/account-workspace/handlers/meter-command-handler.service';
import {
  PredictorCommandHandler, PredictorDeletionPreview, predictorDeletionSnapshot
} from '@data/account-workspace/handlers/predictor-command-handler.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { isStandardPredictor } from '@data/models/idbModels/predictor';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { InventoryToolsSource, inventoryToolsContextKey } from '../inventory-tools.models';

export interface InventoryDeletionReview {
  readonly accountGuid: string;
  readonly meters: readonly MeterDeletionChanges[];
  readonly predictors: readonly PredictorDeletionPreview[];
}

/** Selection and reviewed commands live with the routed inventory, independent of its tools view. */
export class InventorySelectionController {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly selectingValue = signal(false);
  private readonly selectedValue = signal<readonly string[]>([]);
  private readonly savingValue = signal(false);
  private readonly errorValue = signal('');
  private readonly reviewValue = signal<InventoryDeletionReview | undefined>(undefined);
  readonly selecting = this.selectingValue.asReadonly();
  readonly selected = this.selectedValue.asReadonly();
  readonly saving = this.savingValue.asReadonly();
  readonly error = this.errorValue.asReadonly();
  readonly review = this.reviewValue.asReadonly();
  readonly resource = computed(() => this.source.context().resource);
  readonly contextKey = computed(() => inventoryToolsContextKey(this.source.context()));
  readonly canAct = computed(() => this.workspace.canWrite() && !this.workspace.hasPending() && !this.saving());
  readonly canToggle = computed(() => this.canAct() && (this.selecting() || !!this.source.matchingGuids().length));
  readonly selectable = computed(() => Object.fromEntries(this.source.scopeGuids().map(guid => [
    guid,
    this.resource() === 'meters' || this.workspace.predictors().some(predictor =>
      predictor.guid === guid && (isStandardPredictor(predictor) || predictor.predictorType === 'Weather'))
  ])));
  readonly reviewGroups = computed(() => {
    const review = this.review();
    if (!review) {
      return [];
    }
    return this.workspace.facilities().flatMap(facility => {
      const meters = review.meters.filter(item => item.meter.facilityId === facility.guid);
      const predictors = review.predictors.find(item => item.facilityGuid === facility.guid);
      const count = meters.length + (predictors?.predictors.length ?? 0);
      return count ? [{
        guid: facility.guid,
        name: facility.name,
        count,
        readings: meters.reduce((total, item) => total + item.meterData.length, 0) +
          (predictors?.predictorData.length ?? 0),
        analyses: predictors?.facilityAnalyses.length ?? 0
      }] : [];
    });
  });

  constructor(readonly source: InventoryToolsSource) {
    let previousContext = '';
    let previousFilters = '';
    effect(() => {
      const context = this.contextKey();
      const filters = source.filtersKey();
      untracked(() => {
        if (context !== previousContext) {
          previousContext = context;
          this.errorValue.set('');
          this.savingValue.set(false);
          this.reviewValue.set(undefined);
          this.clearSelection();
        } else if (filters !== previousFilters) {
          this.clearSelection();
        }
        previousFilters = filters;
      });
    });
    effect(() => {
      const available = new Set(source.scopeGuids());
      untracked(() => this.selectedValue.update(ids => ids.filter(id => available.has(id))));
    });
    const unregister = inject(UnsavedChangesService).register(
      () => false,
      () => {},
      () => this.saving() || !!this.review()
    );
    this.destroyRef.onDestroy(unregister);
  }

  toggleSelection(): void {
    if (!this.canToggle()) {
      return;
    }
    if (this.selecting()) {
      this.clearSelection();
    } else {
      this.selectingValue.set(true);
    }
  }

  clearSelection(): void {
    this.selectedValue.set([]);
    this.selectingValue.set(false);
  }

  select(change: { guid: string; selected: boolean }): void {
    if (!this.canAct() || !this.selectable()[change.guid]) {
      return;
    }
    this.selectedValue.update(ids => change.selected
      ? [...new Set([...ids, change.guid])]
      : ids.filter(id => id !== change.guid));
  }

  selectAll(): void {
    if (this.canAct()) {
      this.selectedValue.set(this.source.matchingGuids().filter(id => this.selectable()[id]));
    }
  }

  requestDelete(): boolean {
    if (!this.canAct() || !this.selected().length) {
      return false;
    }
    this.errorValue.set('');
    this.reviewValue.set(this.snapshot());
    return true;
  }

  cancelDelete(): boolean {
    if (this.saving()) {
      return false;
    }
    this.reviewValue.set(undefined);
    return true;
  }

  /** A replaced portal abandons its presentation, not the already submitted durable command. */
  abandonReview(): void {
    this.reviewValue.set(undefined);
  }

  async confirmDelete(): Promise<boolean> {
    const reviewed = this.review();
    if (!reviewed || !this.canAct()) {
      return false;
    }
    const context = this.contextKey();
    const resource = this.resource();
    const isCurrentContext = () => !this.destroyRef.destroyed && this.contextKey() === context;
    const isCurrentReview = () => isCurrentContext() && this.review() === reviewed;
    if (predictorDeletionSnapshot(reviewed) !== predictorDeletionSnapshot(this.snapshot())) {
      this.errorValue.set('The selected records changed. Review the deletion again.');
      this.cancelDelete();
      return false;
    }
    this.savingValue.set(true);
    try {
      const meterHandler = resource === 'meters' ? this.injector.get(MeterCommandHandler) : undefined;
      const predictorHandler = resource === 'predictors' ? this.injector.get(PredictorCommandHandler) : undefined;
      await this.injector.get(WorkspaceCommandBoundary).execute({
        entityKind: resource === 'meters' ? 'meter' : 'predictor',
        changeKind: 'bulk',
        entityGuid: reviewed.accountGuid,
        label: `Deleting ${resource}`,
        publication: { mode: 'reload' }
      }, () => meterHandler
        ? meterHandler.deleteMetersAcrossFacilities(reviewed.meters, reviewed.accountGuid)
        : predictorHandler!.deletePredictorsAcrossFacilities(reviewed.predictors, reviewed.accountGuid));
      if (!isCurrentReview()) {
        return false;
      }
      this.reviewValue.set(undefined);
      this.clearSelection();
      return true;
    } catch (error) {
      if (isCurrentReview()) {
        this.errorValue.set(error instanceof Error ? error.message : 'The deletion failed. No records were deleted.');
      }
      return false;
    } finally {
      if (isCurrentContext() && (!this.review() || this.review() === reviewed)) {
        this.savingValue.set(false);
      }
    }
  }

  private snapshot(): InventoryDeletionReview {
    const accountGuid = this.workspace.account()!.guid;
    const ids = new Set(this.selected());
    if (this.resource() === 'meters') {
      return structuredClone({
        accountGuid,
        meters: this.workspace.meters().filter(meter => ids.has(meter.guid)).map(meter => ({
          meter,
          meterData: this.workspace.meterData().filter(reading => reading.meterId === meter.guid)
        })),
        predictors: []
      });
    }
    return structuredClone({
      accountGuid,
      meters: [],
      predictors: this.workspace.facilities().flatMap(facility => {
        const predictors = this.workspace.predictors().filter(predictor =>
          predictor.facilityId === facility.guid && ids.has(predictor.guid));
        return predictors.length ? [{
          facilityGuid: facility.guid,
          predictors,
          predictorData: this.workspace.predictorData().filter(reading =>
            predictors.some(predictor => predictor.guid === reading.predictorId)),
          facilityAnalyses: this.workspace.facilityAnalyses().filter(analysis => analysis.facilityId === facility.guid)
        }] : [];
      })
    });
  }
}
