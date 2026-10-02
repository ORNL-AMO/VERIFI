import { Injectable, signal } from '@angular/core';
import { JStatRegressionModel } from '@data/models/analysis';

type ModelsByGroup = Readonly<Record<string, readonly JStatRegressionModel[]>>;

/** Transient generated candidates owned by one facility-analysis workbench. */
@Injectable()
export class RegressionCandidateStore {
  private readonly candidatesValue = signal<Readonly<Record<string, ModelsByGroup>>>({});
  readonly candidates = this.candidatesValue.asReadonly();

  modelsFor(analysisGuid: string, groupGuid: string): readonly JStatRegressionModel[] {
    return this.candidatesValue()[analysisGuid]?.[groupGuid] ?? [];
  }

  set(analysisGuid: string, groupGuid: string, models: readonly JStatRegressionModel[]): void {
    this.candidatesValue.update(current => ({
      ...current,
      [analysisGuid]: {
        ...current[analysisGuid],
        [groupGuid]: models.map(model => structuredClone(model))
      }
    }));
  }

  clear(analysisGuid: string, groupGuid: string): void {
    this.set(analysisGuid, groupGuid, []);
  }
}
