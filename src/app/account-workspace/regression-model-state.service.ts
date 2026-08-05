import { effect, Injectable, signal } from '@angular/core';
import { JStatRegressionModel } from '../models/analysis';
import { AccountWorkspaceStore } from './account-workspace.store';

@Injectable({ providedIn: 'root' })
export class RegressionModelStateService {
  private readonly writableModelsByGroup = signal<Record<string, JStatRegressionModel[]>>({});
  readonly modelsByGroup = this.writableModelsByGroup.asReadonly();

  constructor(workspace: AccountWorkspaceStore) {
    let previousScope: string | undefined;
    effect(() => {
      const scope = `${workspace.account()?.guid ?? ''}:${workspace.selectedFacility()?.guid ?? ''}`;
      if (previousScope !== undefined && scope !== previousScope) this.clear();
      previousScope = scope;
    });
  }

  setForGroup(groupGuid: string, models: JStatRegressionModel[]): void {
    this.writableModelsByGroup.update(current => ({ ...current, [groupGuid]: [...models] }));
  }

  clear(): void {
    this.writableModelsByGroup.set({});
  }
}
