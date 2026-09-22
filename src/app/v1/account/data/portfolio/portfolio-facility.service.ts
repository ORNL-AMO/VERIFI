import { Injectable, inject } from '@angular/core';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { FacilityCommandHandler } from '@data/account-workspace/handlers/facility-command-handler.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { FacilityClassification } from '@data/models/constantsAndTypes';
import { IdbAccount } from '@data/models/idbModels/account';
import { getNewIdbFacility, IdbFacility } from '@data/models/idbModels/facility';
import { WorkspaceWriteError } from '@data/account-workspace/workspace-commands.models';
import { SettingsFormService } from '@shared/settings-forms/settings-form.service';

export interface PortfolioFacilityDraft {
  readonly name: string;
  readonly includeProfileDetails?: boolean;
  readonly country?: string;
  readonly city?: string;
  readonly state?: string;
  readonly zip?: string;
  readonly address?: string;
  readonly naics1?: string;
  readonly naics2?: string;
  readonly naics3?: string;
  readonly size?: number;
  readonly notes?: string;
  readonly color?: string;
  readonly contactName?: string;
  readonly contactEmail?: string;
  readonly contactPhone?: string;
  readonly classification?: FacilityClassification;
}

@Injectable({ providedIn: 'root' })
export class PortfolioFacilityService {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly commandBoundary = inject(WorkspaceCommandBoundary);
  private readonly facilityHandler = inject(FacilityCommandHandler);
  private readonly settingsForms = inject(SettingsFormService);

  async createFacility(draft: PortfolioFacilityDraft): Promise<IdbFacility> {
    const account = this.requireAccount();
    const facility = this.buildFacility(account, draft);
    const result = await this.commandBoundary.execute(
      {
        entityKind: 'facility',
        changeKind: 'add',
        entityGuid: facility.guid,
        label: 'Adding facility',
        notification: {
          successTitle: 'Facility added',
          successMessage: facility.name
        },
        publication: { mode: 'reload' }
      },
      () => this.facilityHandler.add(
        facility,
        account.guid,
        this.workspace.accountAnalyses(),
        this.workspace.accountReports()
      )
    );
    return result.value.facility;
  }

  async deleteFacility(facility: IdbFacility): Promise<void> {
    const account = this.requireAccount();
    await this.commandBoundary.execute(
      {
        entityKind: 'facility',
        changeKind: 'delete',
        entityGuid: facility.guid,
        label: 'Deleting facility',
        notification: {
          successTitle: 'Facility deleted',
          successMessage: facility.name
        },
        publication: { mode: 'reload' }
      },
      () => this.facilityHandler.delete(facility, account.guid)
    );
  }

  async applyAccountSettingsToFacilities(facilityGuids: readonly string[]): Promise<readonly IdbFacility[]> {
    const account = this.requireAccount();
    const selectedGuids = new Set(facilityGuids);
    const facilities = this.workspace.facilities()
      .filter(facility => selectedGuids.has(facility.guid))
      .map(facility => this.applyAccountSettings(account, structuredClone(facility)));

    if (facilities.length === 0) {
      return [];
    }

    const result = await this.commandBoundary.execute(
      {
        entityKind: 'facility',
        changeKind: 'bulk',
        entityGuid: account.guid,
        label: 'Applying account settings',
        notification: {
          successTitle: 'Account settings applied',
          successMessage: `${facilities.length} ${facilities.length === 1 ? 'facility' : 'facilities'} updated`
        },
        publication: {
          mode: 'patch',
          buildPatch: value => ({
            collections: [{ collection: 'facilities', upsert: value }]
          })
        }
      },
      async () => {
        const saved: IdbFacility[] = [];
        for (const facility of facilities) {
          saved.push(await this.facilityHandler.update(facility, account.guid));
        }
        return saved;
      }
    );
    return result.value;
  }

  buildFacility(account: IdbAccount, draft: PortfolioFacilityDraft): IdbFacility {
    const name = draft.name.trim();
    if (!name) {
      throw new WorkspaceWriteError('validation-failed', 'A facility name is required.');
    }

    const facility: IdbFacility = {
      ...getNewIdbFacility(account),
      name
    };

    if (!draft.includeProfileDetails) {
      return facility;
    }

    return {
      ...facility,
      country: draft.country ?? facility.country,
      city: draft.city ?? facility.city,
      state: draft.state ?? facility.state,
      zip: draft.zip ?? facility.zip,
      address: draft.address ?? facility.address,
      naics1: draft.naics1 ?? facility.naics1,
      naics2: draft.naics2 ?? facility.naics2,
      naics3: draft.naics3 ?? facility.naics3,
      size: draft.size ?? facility.size,
      notes: draft.notes ?? facility.notes,
      color: draft.color ?? facility.color,
      contactName: draft.contactName ?? facility.contactName,
      contactEmail: draft.contactEmail ?? facility.contactEmail,
      contactPhone: draft.contactPhone ?? facility.contactPhone,
      classification: draft.classification ?? facility.classification
    };
  }

  private applyAccountSettings(account: IdbAccount, facility: IdbFacility): IdbFacility {
    return {
      ...facility,
      unitsOfMeasure: account.unitsOfMeasure,
      energyUnit: account.energyUnit,
      electricityUnit: account.electricityUnit,
      volumeLiquidUnit: account.volumeLiquidUnit,
      volumeGasUnit: account.volumeGasUnit,
      massUnit: account.massUnit,
      energyIsSource: account.energyIsSource,
      eGridSubregion: account.eGridSubregion,
      sustainabilityQuestions: structuredClone(this.settingsForms.normalizeSustainabilityQuestions(account.sustainabilityQuestions)),
      fiscalYear: account.fiscalYear,
      fiscalYearMonth: account.fiscalYearMonth,
      fiscalYearCalendarEnd: account.fiscalYearCalendarEnd,
      dataStalenessSettings: {
        ...this.settingsForms.normalizeDataStalenessSettings(account.dataStalenessSettings),
        useAccountSettings: true
      }
    };
  }

  private requireAccount(): IdbAccount {
    const account = this.workspace.account();
    if (!account) {
      throw new WorkspaceWriteError('workspace-not-ready', 'An active account is required.');
    }
    return account;
  }
}
