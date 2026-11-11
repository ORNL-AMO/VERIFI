import { Injectable } from '@angular/core';
import { getNewIdbSavedVisualization, IdbSavedVisualization } from '@data/models/idbModels/savedVisualization';
import { readSavedVisualization, SavedVisualizationReadResult } from '@data/visualizations/saved-visualization-record';
import { VisualizationDefinition } from '@domain/visualizations/visualization-definition';
import { AccountWorkspaceStore } from './account-workspace.store';
import { WorkspaceCommandBoundary } from './workspace-command-boundary.service';
import { WorkspaceWriteError } from './workspace-commands.models';
import { CreateVisualizationCommand, DuplicateVisualizationCommand, VisualizationCommand, VisualizationCommandOutcome, VisualizationConflictError } from './visualization-commands.models';
import { VisualizationCommandHandler } from './handlers/visualization-command-handler.service';
import { inspectVisualizationReferences } from './visualization-reference-inspection';

@Injectable({ providedIn: 'root' })
export class SavedVisualizationCommands {
  private readonly running = new Map<string, Promise<VisualizationCommandOutcome>>();
  private readonly unpublished = new Map<string, VisualizationCommandOutcome>();
  constructor(private readonly boundary: WorkspaceCommandBoundary, private readonly handler: VisualizationCommandHandler,
    private readonly workspace: AccountWorkspaceStore) { }

  /** Keep this command in the live editor until acknowledged or explicitly discarded. */
  prepareCreate(definition: VisualizationDefinition): CreateVisualizationCommand {
    const record = getNewIdbSavedVisualization(definition);
    return { kind: 'create', accountGuid: record.accountId, guid: record.guid,
      definition: structuredClone(definition), createdDate: record.createdDate.toISOString() };
  }

  prepareDuplicate(record: Readonly<IdbSavedVisualization>, name?: string): DuplicateVisualizationCommand {
    const decoded = readSavedVisualization(record);
    if (decoded.state !== 'valid' && decoded.state !== 'setup-required') throw new WorkspaceWriteError('validation-failed', 'Repair this visualization before duplicating it.');
    const proposal = this.prepareCreate({ ...decoded.definition, name: name ?? `${decoded.definition.name} (Copy)` });
    return { ...proposal, kind: 'duplicate', sourceGuid: record.guid, expectedRevision: record.revision };
  }

  submit(command: VisualizationCommand): Promise<VisualizationCommandOutcome> {
    let submitted: VisualizationCommand;
    let key: string;
    try { submitted = structuredClone(command); key = JSON.stringify(submitted); }
    catch (error) { return Promise.resolve({ state: 'failed', command, error }); }
    const unfinished = this.unpublished.get(key);
    if (unfinished) return Promise.resolve(unfinished);
    const pending = this.running.get(key);
    if (pending) return pending;
    const operation = this.execute(submitted).then(result => {
      if (result.state === 'refresh-required') this.unpublished.set(key, result);
      return result;
    }).finally(() => this.running.delete(key));
    this.running.set(key, operation);
    return operation;
  }

  private async execute(submitted: VisualizationCommand): Promise<VisualizationCommandOutcome> {
    let committed: IdbSavedVisualization | undefined;
    let persistenceFinished = false;
    try {
      if (this.workspace.account()?.guid !== submitted.accountGuid) throw new WorkspaceWriteError('cross-account-entity', 'Select the owning account before saving this visualization.');
      const result = await this.boundary.execute({ entityKind: 'savedVisualization', entityGuid: submitted.guid,
        changeKind: submitted.kind === 'delete' ? 'delete' : submitted.kind === 'update' ? 'update' : 'add',
        label: submitted.kind === 'delete' ? 'Deleting visualization' : 'Saving visualization', notification: { suppressSuccessToast: true } }, async () => {
          committed = submitted.kind === 'create' ? await this.handler.create(submitted, submitted.accountGuid)
            : submitted.kind === 'duplicate' ? await this.handler.duplicate(submitted, submitted.accountGuid)
            : submitted.kind === 'update' ? await this.handler.update(submitted, submitted.accountGuid)
            : (await this.handler.delete(submitted, submitted.accountGuid), undefined);
          persistenceFinished = true;
          return committed;
        });
      // Availability uses only the committed snapshot. It cannot turn a successful save into another write failure.
      const decoded = result.value ? readSavedVisualization(result.value) : undefined;
      const snapshot = this.workspace.snapshot();
      const referenceIssues = decoded && (decoded.state === 'valid' || decoded.state === 'setup-required') && snapshot
        ? inspectVisualizationReferences(decoded.definition, snapshot, result.value.preservation?.references)
        : result.value?.preservation?.references ?? [];
      return { state: 'committed', command: submitted, value: result.value, referenceIssues };
    } catch (error) {
      if (error instanceof VisualizationConflictError) return { state: 'conflict', command: submitted, current: error.current, error };
      return { state: persistenceFinished || error instanceof WorkspaceWriteError && error.persistenceCommitted ? 'refresh-required' : 'failed', command: submitted, error };
    }
  }

  async recover(accountGuid: string, guid: string): Promise<SavedVisualizationReadResult | undefined> {
    if (!this.workspace.isReady() || this.workspace.account()?.guid !== accountGuid)
      throw new WorkspaceWriteError('stale-workspace', 'Select the ready owning account before visualization recovery.');
    await this.boundary.recoverCommittedPublication(accountGuid);
    if (!this.workspace.isReady() || this.workspace.account()?.guid !== accountGuid)
      throw new WorkspaceWriteError('stale-workspace', 'The account changed before visualization recovery.');
    const record = this.workspace.savedVisualizations().find(item => item.guid === guid);
    for (const [key, result] of this.unpublished) {
      if (result.command.accountGuid === accountGuid && result.command.guid === guid) this.unpublished.delete(key);
    }
    return record ? readSavedVisualization(record) : undefined;
  }
}
