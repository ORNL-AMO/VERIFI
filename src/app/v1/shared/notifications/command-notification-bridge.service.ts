import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { WorkspaceChangeKind, WorkspaceCommittedChange, WorkspaceEntityKind } from '@data/account-workspace/workspace-commands.models';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { NotificationService } from './notification.service';

const ENTITY_LABELS: Record<WorkspaceEntityKind, string> = {
  account: 'Account',
  facility: 'Facility',
  meter: 'Meter',
  meterData: 'Meter data',
  meterGroup: 'Meter group',
  predictor: 'Predictor',
  predictorData: 'Predictor data',
  facilityAnalysis: 'Facility analysis',
  accountAnalysis: 'Account analysis',
  facilityReport: 'Facility report',
  accountReport: 'Account report',
  customEmissions: 'Custom emissions item',
  customFuel: 'Custom fuel',
  customGWP: 'Custom GWP',
  energyUseGroup: 'Energy-use group',
  energyUseEquipment: 'Energy-use equipment'
};

const CHANGE_LABELS: Record<WorkspaceChangeKind, string> = {
  add: 'created',
  update: 'updated',
  delete: 'deleted',
  bulk: 'updated'
};

@Injectable({ providedIn: 'root' })
export class CommandNotificationBridgeService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly commandBoundary = inject(WorkspaceCommandBoundary);
  private readonly notifications = inject(NotificationService);

  constructor() {
    this.commandBoundary.committedChange$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(change => this.notifyCommittedChange(change));
  }

  private notifyCommittedChange(change: WorkspaceCommittedChange): void {
    if (change.notification?.suppressSuccessToast) {
      return;
    }

    this.notifications.success(
      change.notification?.successTitle ?? this.defaultSuccessTitle(change),
      { message: change.notification?.successMessage }
    );
  }

  private defaultSuccessTitle(change: WorkspaceCommittedChange): string {
    const entityLabel = change.notification?.entityName || ENTITY_LABELS[change.entityKind];
    return `${entityLabel} ${CHANGE_LABELS[change.changeKind]}`;
  }
}
