import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ApplicationLifecycleService } from '@app/application-lifecycle/application-lifecycle.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { AccountCommandHandler } from '@data/account-workspace/handlers/account-command-handler.service';
import { FacilityCommandHandler } from '@data/account-workspace/handlers/facility-command-handler.service';
import { DataValidationSettingsCommandHandler } from '@data/account-workspace/handlers/data-validation-settings-command-handler.service';
import { getNewIdbAccount } from '@data/models/idbModels/account';
import { getNewIdbFacility } from '@data/models/idbModels/facility';
import { DataValidationSettingsEditor } from './data-validation-settings-editor.service';

export function configureDataValidationSettingsTest() {
    const account = signal({ ...getNewIdbAccount(), id: 1, guid: 'account-a' });
    const facility = signal({ ...getNewIdbFacility(account()), id: 2, guid: 'facility-a' });
    const canWrite = signal(true);
    const accountUpdate = vi.fn(async updated => { account.set(updated); return updated; });
    const facilityUpdate = vi.fn(async updated => { facility.set(updated); return updated; });
    const execute = vi.fn(async (_metadata, persist) => ({ value: await persist() }));
    TestBed.configureTestingModule({ providers: [
      DataValidationSettingsEditor,
      { provide: AccountWorkspaceStore, useValue: { account, selectedFacility: facility, canWrite } },
      { provide: WorkspaceCommandBoundary, useValue: { execute } },
      { provide: AccountCommandHandler, useValue: { update: accountUpdate } },
      { provide: FacilityCommandHandler, useValue: { update: facilityUpdate } },
      { provide: DataValidationSettingsCommandHandler, useValue: { updateSingleFacility: vi.fn() } },
      { provide: ApplicationLifecycleService, useValue: { refreshAccountCatalog: vi.fn(async () => undefined) } }
    ] });
    return { account, facility, canWrite, accountUpdate, facilityUpdate, execute };
}
