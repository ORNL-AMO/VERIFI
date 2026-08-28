import { Directive, inject } from '@angular/core';
import { ApplicationLifecycleService } from '@app/application-lifecycle/application-lifecycle.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { AccountCommandHandler } from '@data/account-workspace/handlers/account-command-handler.service';
import { FacilityCommandHandler } from '@data/account-workspace/handlers/facility-command-handler.service';
import { IdbAccount } from '@data/models/idbModels/account';
import { IdbFacility } from '@data/models/idbModels/facility';
import { SettingsDetailBase, SettingsSaveState } from '../../shared/settings/settings-detail.base';

export type FacilitySettingsDetail = 'profile' | 'units' | 'goals' | 'financial' | 'staleness' | 'backup' | 'delete';
export type FacilitySettingsSaveState = SettingsSaveState;

export const FACILITY_SETTINGS_DETAILS: ReadonlyArray<FacilitySettingsDetail> = [
  'profile',
  'units',
  'goals',
  'financial',
  'staleness',
  'backup',
  'delete'
];

interface FacilitySettingsSaveResult {
  readonly facility: IdbFacility;
  readonly account?: IdbAccount;
}

@Directive()
export abstract class FacilitySettingsDetailBase extends SettingsDetailBase {
  protected readonly workspace = inject(AccountWorkspaceStore);
  protected readonly commandBoundary = inject(WorkspaceCommandBoundary);
  protected readonly accountHandler = inject(AccountCommandHandler);
  protected readonly facilityHandler = inject(FacilityCommandHandler);
  protected readonly lifecycle = inject(ApplicationLifecycleService);

  readonly account = this.workspace.account;
  readonly facility = this.workspace.selectedFacility;
  readonly facilities = this.workspace.facilities;
  readonly canWrite = this.workspace.canWrite;

  protected async saveFacility(
    label: string,
    buildFacility: (facility: IdbFacility) => IdbFacility,
    buildAccount?: (account: IdbAccount) => IdbAccount
  ): Promise<void> {
    const account = this.account();
    const facility = this.facility();
    if (!account || !facility || !this.canWrite()) {
      return;
    }

    const updatedFacility = buildFacility(structuredClone(facility));
    const updatedAccount = account.isSingleFacilityCompany && buildAccount
      ? buildAccount(structuredClone(account))
      : undefined;

    await this.runSave(label, async () => {
      await this.commandBoundary.execute(
        {
          entityKind: updatedAccount ? 'account' : 'facility',
          changeKind: 'update',
          entityGuid: updatedAccount?.guid ?? updatedFacility.guid,
          label,
          publication: {
            mode: 'patch',
            buildPatch: value => ({
              account: value.account,
              collections: [{ collection: 'facilities', upsert: [value.facility] }]
            })
          }
        },
        async (): Promise<FacilitySettingsSaveResult> => {
          const savedAccount = updatedAccount
            ? await this.accountHandler.update({ ...updatedAccount }, account.guid)
            : undefined;
          const savedFacility = await this.facilityHandler.update({ ...updatedFacility }, account.guid);
          return {
            account: savedAccount,
            facility: savedFacility
          };
        }
      );
      if (updatedAccount) {
        await this.lifecycle.refreshAccountCatalog();
      }
    });
  }

  protected override async runSave(label: string, save: () => Promise<void>): Promise<void> {
    await super.runSave(label, save, 'v1 facility settings');
  }
}
