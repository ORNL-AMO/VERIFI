import { singleFacilityPresentation } from '@app/v1/shared/navigation/single-facility-presentation';
import { Directive, computed, inject } from '@angular/core';
import { ApplicationLifecycleService } from '@app/application-lifecycle/application-lifecycle.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { AccountCommandHandler } from '@data/account-workspace/handlers/account-command-handler.service';
import { FacilityCommandHandler } from '@data/account-workspace/handlers/facility-command-handler.service';
import { SingleFacilitySettingsCommandHandler } from '@data/account-workspace/handlers/single-facility-settings-command-handler.service';
import { facilitySettingsChange, FacilitySettingsChange } from '@data/account-workspace/facility-settings.models';
import { IdbAccount } from '@data/models/idbModels/account';
import { IdbFacility } from '@data/models/idbModels/facility';
import { SettingsDetailBase, SettingsSaveState } from '@app/v1/shared/settings/settings-detail.base';

export type FacilitySettingsDetail = 'profile' | 'units' | 'goals' | 'financial' | 'data-validation' | 'backup' | 'portfolio' | 'delete';
export type FacilitySettingsSaveState = SettingsSaveState;

export const FACILITY_SETTINGS_DETAILS: ReadonlyArray<FacilitySettingsDetail> = [
  'profile',
  'units',
  'goals',
  'financial',
  'data-validation',
  'backup',
  'portfolio',
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
  private readonly singleFacilitySettings = inject(SingleFacilitySettingsCommandHandler);
  protected readonly lifecycle = inject(ApplicationLifecycleService);

  readonly singleFacilityPresentation = computed(() => !!singleFacilityPresentation(this.workspace.account(), this.workspace.facilities(), this.workspace.status() === 'ready'));
  readonly account = this.workspace.account;
  readonly facility = this.workspace.selectedFacility;
  readonly facilities = this.workspace.facilities;
  readonly canWrite = this.workspace.canWrite;

  protected async saveFacility(
    label: string,
    group: FacilitySettingsChange['group'],
    buildFacility: (facility: IdbFacility) => IdbFacility
  ): Promise<void> {
    const account = this.account();
    const facility = this.facility();
    if (!account || !facility || !this.canWrite()) {
      return;
    }

    const updatedFacility = buildFacility(structuredClone(facility));
    const mirrorAccount = !!account.isSingleFacilityCompany;
    const change = facilitySettingsChange(group, updatedFacility);

    await this.runSave(label, async () => {
      await this.commandBoundary.execute(
        {
          entityKind: mirrorAccount ? 'account' : 'facility',
          changeKind: 'update',
          entityGuid: mirrorAccount ? account.guid : updatedFacility.guid,
          label,
          notification: { suppressSuccessToast: true },
          publication: {
            mode: 'patch',
            buildPatch: value => ({
              account: value.account,
              collections: [{ collection: 'facilities', upsert: [value.facility] }]
            })
          }
        },
        async (): Promise<FacilitySettingsSaveResult> => {
          if (mirrorAccount) {
            return this.singleFacilitySettings.update(
              { id: account.id, guid: account.guid },
              { id: facility.id, guid: facility.guid, accountId: facility.accountId },
              change,
              account.guid
            );
          }
          const savedFacility = await this.facilityHandler.update({ ...updatedFacility }, account.guid);
          return { facility: savedFacility };
        }
      );
      if (mirrorAccount) {
        await this.lifecycle.refreshAccountCatalog();
      }
    }, true);
  }

  protected override async runSave(label: string, save: () => Promise<void>, savesForm = false): Promise<void> {
    await super.runSave(label, save, savesForm, 'v1 facility settings');
  }
}
