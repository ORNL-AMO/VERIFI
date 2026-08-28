import { TestBed } from '@angular/core/testing';
import { WorkspaceCommittedChange } from '@data/account-workspace/workspace-commands.models';
import { Subject } from 'rxjs';
import { vi } from 'vitest';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { CommandNotificationBridgeService } from './command-notification-bridge.service';
import { NotificationService } from './notification.service';

describe('CommandNotificationBridgeService', () => {
  let committedChanges: Subject<WorkspaceCommittedChange>;
  let success: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    committedChanges = new Subject<WorkspaceCommittedChange>();
    success = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        CommandNotificationBridgeService,
        { provide: WorkspaceCommandBoundary, useValue: { committedChange$: committedChanges.asObservable() } },
        { provide: NotificationService, useValue: { success } }
      ]
    });
    TestBed.inject(CommandNotificationBridgeService);
  });

  afterEach(() => {
    committedChanges.complete();
  });

  it('creates success toasts for add, update, delete, and bulk committed changes', () => {
    emitChange({ entityKind: 'facility', changeKind: 'add' });
    emitChange({ entityKind: 'meter', changeKind: 'update' });
    emitChange({ entityKind: 'predictor', changeKind: 'delete' });
    emitChange({ entityKind: 'meterData', changeKind: 'bulk' });

    expect(success.mock.calls.map(call => call[0])).toEqual([
      'Facility created',
      'Meter updated',
      'Predictor deleted',
      'Meter data updated'
    ]);
  });

  it('honors custom success copy', () => {
    emitChange({
      entityKind: 'account',
      changeKind: 'update',
      notification: {
        successTitle: 'Portfolio mode enabled',
        successMessage: 'North Plant was added to the account.'
      }
    });

    expect(success).toHaveBeenCalledWith(
      'Portfolio mode enabled',
      { message: 'North Plant was added to the account.' }
    );
  });

  it('uses an entity name override in default copy', () => {
    emitChange({
      entityKind: 'facility',
      changeKind: 'delete',
      notification: { entityName: 'North Plant' }
    });

    expect(success).toHaveBeenCalledWith('North Plant deleted', { message: undefined });
  });

  it('suppresses success toasts when requested', () => {
    emitChange({
      entityKind: 'account',
      changeKind: 'update',
      notification: { suppressSuccessToast: true }
    });

    expect(success).not.toHaveBeenCalled();
  });

  it('does not toast when no committed change is emitted', () => {
    expect(success).not.toHaveBeenCalled();
  });

  function emitChange(change: Partial<WorkspaceCommittedChange>): void {
    committedChanges.next({
      entityKind: 'account',
      changeKind: 'update',
      accountGuid: 'account-a',
      ...change
    });
  }
});
