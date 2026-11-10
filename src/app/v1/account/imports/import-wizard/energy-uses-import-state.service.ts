import { Injectable, computed, inject } from '@angular/core';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { WorkspaceWriteError } from '@data/account-workspace/workspace-commands.models';
import { EnergyUsesExcelImportService, EnergyUsesImportPreview } from '@data/import/energy-uses/energy-uses-excel-import.service';
import { EnergyUsesTemplateImportFileDraft, ImportCommitSummary, ImportEntityCounts } from '@data/import/spreadsheet-import.models';
import { ImportSessionService } from '../import-session.service';
import { ImportWizardDraftStore } from './import-wizard-draft.store';

/** Route-owned review state; workbook drafts remain in the shared upload session. */
@Injectable()
export class EnergyUsesImportStateService {
  private readonly drafts = inject(ImportWizardDraftStore);
  private readonly session = inject(ImportSessionService);
  private readonly importer = inject(EnergyUsesExcelImportService);
  private readonly commands = inject(WorkspaceCommandBoundary);
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly workspaceService = inject(AccountWorkspaceService);
  readonly draft = computed(() => {
    const draft = this.drafts.draft();
    return draft?.kind === 'energy-uses-template' ? draft : undefined;
  });
  readonly preview = computed(() => this.draft()?.energyUses.preview);
  readonly canImport = computed(() => !this.validationMessage());
  readonly refreshRequired = computed(() => !!this.draft()?.energyUses.requiresWorkspaceRefresh);
  readonly reviewStale = computed(() => {
    const preview = this.preview();
    return this.refreshRequired() || !!preview && (preview.accountGuid !== this.workspace.account()?.guid || preview.revision !== this.workspace.revision());
  });
  readonly needsRefresh = computed(() => !!this.draft()?.energyUses.recoverySummary);

  setYear(year: number | null): void {
    const draft = this.draft();
    if (!draft || this.session.pending() || this.needsRefresh() || this.refreshRequired() || draft.energyUses.year === year) return;
    draft.energyUses.year = year;
    draft.energyUses.preview = undefined;
    draft.completedSteps = [];
    this.drafts.changed();
  }

  review(): void {
    const draft = this.draft();
    if (!draft || this.session.pending() || this.needsRefresh() || this.refreshRequired()) return;
    const year = draft.energyUses.year;
    if (!Number.isInteger(year) || year < 1000 || year > 9999) {
      throw new Error('Enter a four-digit fiscal year.');
    }
    draft.energyUses.preview = this.importer.preparePreview(draft.energyUses.workbook, year, new Set(draft.energyUses.skippedRows));
    draft.completedSteps = [];
    this.drafts.changed();
  }

  async refreshReview(): Promise<void> {
    const draft = this.draft();
    if (!draft || this.session.pending() || this.needsRefresh()) return;
    const accountGuid = draft.energyUses.preview?.accountGuid;
    if (!accountGuid || accountGuid !== this.workspace.account()?.guid) throw new Error('The owning account is no longer available.');
    this.session.setPending(true);
    try {
      const result = await this.workspaceService.reloadActiveWorkspace();
      if (result !== 'published' || this.draft()?.id !== draft.id || this.workspace.account()?.guid !== accountGuid) {
        throw new Error('The workspace changed while refreshing. Review the workbook again.');
      }
      const data = draft.energyUses;
      const preview = this.importer.preparePreview(data.workbook, data.year, new Set(data.skippedRows));
      data.preview = preview;
      data.requiresWorkspaceRefresh = false;
      draft.completedSteps = [];
      this.drafts.changed();
    } finally { this.session.setPending(false); }
  }

  skipRow(row: number, skip: boolean): void {
    const draft = this.draft();
    if (!draft || this.session.pending() || this.needsRefresh() || this.refreshRequired()) return;
    const preview = draft.energyUses.preview;
    if (!preview || preview.accountGuid !== this.workspace.account()?.guid || preview.revision !== this.workspace.revision()) {
      throw new Error('Saved data changed. Review the workbook again before changing included rows.');
    }
    const skipped = new Set(draft.energyUses.skippedRows);
    if (skip) skipped.add(row); else skipped.delete(row);
    const updated = this.importer.preparePreview(draft.energyUses.workbook, draft.energyUses.year, skipped);
    draft.energyUses.skippedRows = [...skipped];
    draft.energyUses.preview = updated;
    draft.completedSteps = [];
    this.drafts.changed();
  }

  validationMessage(): string | undefined {
    const data = this.draft()?.energyUses;
    if (data?.requiresWorkspaceRefresh) return 'Refresh saved data and review this workbook again before importing.';
    if (!data || !Number.isInteger(data.year) || data.year < 1000 || data.year > 9999) return 'Enter a four-digit fiscal year.';
    if (!data.preview) return 'Review the equipment changes before importing.';
    if (data.preview.accountGuid !== this.workspace.account()?.guid || data.preview.revision !== this.workspace.revision()) {
      return 'Saved data changed. Review this workbook again before importing.';
    }
    if (!data.preview.canImport) return 'Include at least one change and fix or skip every row with errors.';
    return undefined;
  }

  async commit(): Promise<ImportCommitSummary> {
    const draft = this.draft();
    if (!draft) throw new Error('The upload session is no longer available.');
    if (draft.energyUses.recoverySummary) {
      await this.commands.recoverCommittedPublication(draft.energyUses.preview.accountGuid);
      const summary = draft.energyUses.recoverySummary;
      draft.energyUses.recoverySummary = undefined;
      this.drafts.changed();
      return summary;
    }
    const message = this.validationMessage();
    if (message) throw new Error(message);
    const preview = draft.energyUses.preview;
    const summary = this.summary(preview);
    try {
      await this.importer.apply(preview);
    } catch (error) {
      if (error instanceof WorkspaceWriteError && error.persistenceCommitted) {
        draft.energyUses.recoverySummary = summary;
        this.drafts.changed();
      } else if (error instanceof WorkspaceWriteError && error.code === 'stale-workspace') {
        draft.energyUses.requiresWorkspaceRefresh = true;
        this.drafts.changed();
      }
      throw error;
    }
    return summary;
  }

  private summary(preview: EnergyUsesImportPreview): ImportCommitSummary {
    const counts = (): ImportEntityCounts => ({ facilities: 0, meterGroups: 0, meters: 0, meterReadings: 0,
      predictors: 0, predictorReadings: 0, energyUseGroups: 0, energyUseEquipment: 0 });
    const added = counts(), updated = counts();
    added.energyUseGroups = preview.newGroups.length;
    added.energyUseEquipment = preview.created;
    updated.energyUseEquipment = preview.updated;
    const affected = preview.rows.filter(row => !row.skipped && (row.action === 'Create' || row.action === 'Update'));
    return { added, updated, affectedFacilityGuids: [...new Set(affected.map(row => row.updatedEquipment.facilityId))],
      skippedMeterReadings: 0, excludedInvalidMeterReadings: 0, skippedPredictorReadings: 0, excludedInvalidPredictorReadings: 0 };
  }
}
