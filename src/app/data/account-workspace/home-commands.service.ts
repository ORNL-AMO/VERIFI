import { Injectable } from '@angular/core';
import { getNewIdbEntry } from '@data/models/idbModels/idbEntry';
import { homeRecordOwner, IdbHomeDashboard } from '@data/models/idbModels/homeDashboard';
import { readHomeDashboard, readHomeOwner } from '@data/home/home-record';
import { HomeTemplateBlueprint, prepareHomeGraph } from '@data/home/home-template-graph';
import { homeDashboardVisible, homeOwnerResolutionState } from '@data/home/home-references';
import { HomeDashboardDefinition, HomeOwner, HomeOwnerState, presentedHomeOwner, resolveHomeDefault, sameHomeOwner } from '@domain/home/home-dashboard';
import { AccountWorkspaceStore } from './account-workspace.store';
import { WorkspaceCommandBoundary } from './workspace-command-boundary.service';
import { WorkspaceWriteError } from './workspace-commands.models';
import { HomeCommand, HomeCommandOutcome, HomeCommandValue, HomeConflictError } from './home-commands.models';
import { HomeCommandHandler } from './handlers/home-command-handler.service';

/** Proposal/session receipts live here; durable intent lives only in workspace snapshots and native stores. */
@Injectable({ providedIn: 'root' })
export class HomeCommands {
  private readonly running = new Map<string, Promise<HomeCommandOutcome>>();
  private readonly unpublished = new Map<string, { command: HomeCommand; value?: HomeCommandValue; outcome: HomeCommandOutcome }>();
  private readonly recovered = new Map<string, HomeCommandOutcome>();
  constructor(private readonly boundary: WorkspaceCommandBoundary, private readonly handler: HomeCommandHandler,
    private readonly workspace: AccountWorkspaceStore) { }

  ownerView(owner: HomeOwner) {
    const records = this.workspace.homeDashboards().filter(record => sameHomeOwner(homeRecordOwner(record), owner));
    const record = this.workspace.homeOwners().find(record => sameHomeOwner(homeRecordOwner(record), owner));
    const read = record && readHomeOwner(record), account = this.workspace.account();
    const state = read?.state === 'valid' ? read.value : undefined;
    const resolution = state && record ? homeOwnerResolutionState(record, state) : state;
    const visible = account ? records.filter(record => homeDashboardVisible(record, { account, meters: this.workspace.meters() })).map(record => record.guid) : [];
    const initialization = record ? state ? state.initialized ? 'initialized' : 'legacy' : 'unavailable' : records.length ? 'legacy' : 'new';
    const order = resolution?.dashboardOrder ?? [];
    const ordered = [...records].sort((a, b) => {
      const ai = order.indexOf(a.guid), bi = order.indexOf(b.guid);
      return (ai < 0 ? Number.MAX_SAFE_INTEGER : ai) - (bi < 0 ? Number.MAX_SAFE_INTEGER : bi) || (a.id ?? 0) - (b.id ?? 0) || a.guid.localeCompare(b.guid);
    });
    return { record, state, records: ordered, initialization, defaultDashboardGuid: resolution
      ? resolveHomeDefault(resolution, ordered.filter(record => visible.includes(record.guid)).map(record => record.guid)) : undefined };
  }
  prepareInitialize(owner: HomeOwner, blueprints: readonly HomeTemplateBlueprint[]): HomeCommand {
    const identity = this.identity(owner);
    return { ...identity, kind: 'initialize', graph: prepareHomeGraph(identity.accountGuid, owner, blueprints) };
  }
  preparePresentedInitialization(blueprints: readonly HomeTemplateBlueprint[]): HomeCommand {
    this.requireReady();
    const owner = presentedHomeOwner(this.workspace.account()!, this.workspace.facilities());
    if (!owner) throw new WorkspaceWriteError('validation-failed', 'Resolve this single-facility account’s facility configuration before opening Home.');
    return this.prepareInitialize(owner, blueprints);
  }
  prepareCreate(owner: HomeOwner, blueprint: HomeTemplateBlueprint): HomeCommand {
    const identity = this.identity(owner);
    return { ...identity, kind: 'create', graph: prepareHomeGraph(identity.accountGuid, owner, [blueprint]) };
  }
  prepareUpdate(record: Readonly<IdbHomeDashboard>, definition: HomeDashboardDefinition, repairPaths?: readonly string[]): HomeCommand {
    return { ...this.recordIdentity(record), kind: 'update', guid: record.guid, expectedRevision: record.revision,
      definition: structuredClone(definition), ...(repairPaths ? { repairPaths: [...repairPaths] } : {}) };
  }
  prepareDelete(record: Readonly<IdbHomeDashboard>): HomeCommand {
    return { ...this.recordIdentity(record), kind: 'delete', guid: record.guid, expectedRevision: record.revision };
  }
  prepareDuplicate(record: Readonly<IdbHomeDashboard>, name?: string): HomeCommand {
    const read = readHomeDashboard(record);
    if (read.state !== 'valid') throw new WorkspaceWriteError('validation-failed', 'Review this dashboard before duplicating it.');
    return { ...this.recordIdentity(record), kind: 'duplicate', guid: getNewIdbEntry().guid, sourceGuid: record.guid, expectedRevision: record.revision,
      name: name ?? `${read.value.name} (Copy)`, createdDate: new Date().toISOString(),
      widgetIds: Object.fromEntries(read.value.widgets.map(widget => [widget.id, getNewIdbEntry().guid])) };
  }
  prepareTemplateReplacement(record: Readonly<IdbHomeDashboard>, blueprint: HomeTemplateBlueprint, kind: 'restore' | 'upgrade' = 'restore'): HomeCommand {
    const identity = this.recordIdentity(record);
    const graph = prepareHomeGraph(identity.accountGuid, identity.owner, [blueprint]);
    return { ...identity, kind, guid: record.guid, expectedRevision: record.revision,
      graph: { ...graph, dashboards: graph.dashboards.map(dashboard => ({ ...dashboard, guid: record.guid })) } };
  }
  prepareConfigure(owner: HomeOwner, state: HomeOwnerState): HomeCommand {
    return { ...this.identity(owner), kind: 'configure', state: structuredClone(state) };
  }

  submit(command: HomeCommand): Promise<HomeCommandOutcome> {
    let submitted: HomeCommand;
    try { submitted = structuredClone(command); }
    catch (error) { return Promise.resolve({ state: 'failed', command, error }); }
    const key = submitted.operationGuid;
    const receipt = this.unpublished.get(key)?.outcome ?? this.recovered.get(key);
    if (receipt) return Promise.resolve(receipt);
    const running = this.running.get(key);
    if (running) return running;
    const operation = this.execute(submitted).finally(() => this.running.delete(key));
    this.running.set(key, operation);
    return operation;
  }
  private async execute(command: HomeCommand): Promise<HomeCommandOutcome> {
    let value: HomeCommandValue | undefined;
    try {
      if (this.workspace.account()?.guid !== command.accountGuid) throw new WorkspaceWriteError('cross-account-entity', 'Select this dashboard’s account before saving.');
      const result = await this.boundary.execute({ entityKind: 'homeDashboard', entityGuid: 'guid' in command ? command.guid : command.owner.guid,
        changeKind: command.kind === 'delete' ? 'delete' : command.kind === 'create' || command.kind === 'duplicate' || command.kind === 'initialize' ? 'add' : 'update',
        label: 'Saving Home dashboards', notification: { suppressSuccessToast: true }, isNoop: value => !value.changed,
        hydrateNoop: value => this.workspace.homeOwners().find(record => record.guid === value.owner.guid)?.revision !== value.owner.revision }, async () => {
        value = await this.handler.execute(command, command.accountGuid);
        return value;
      });
      return { state: result.value.changed ? 'committed' : 'unchanged', command, value: result.value };
    } catch (error) {
      if (error instanceof HomeConflictError) return { state: 'conflict', command, error };
      if (value?.changed || error instanceof WorkspaceWriteError && error.persistenceCommitted) {
        const outcome: HomeCommandOutcome = { state: 'refresh-required', command, error };
        this.unpublished.set(command.operationGuid, { command, value, outcome });
        return outcome;
      }
      return { state: 'failed', command, error };
    }
  }
  /** Refresh only. Retrying the same recovered proposal returns its receipt without invoking persistence. */
  async recover(accountGuid: string, operationGuid: string): Promise<void> {
    this.requireReady(accountGuid);
    await this.boundary.recoverCommittedPublication(accountGuid, true);
    this.requireReady(accountGuid);
    const receipt = this.unpublished.get(operationGuid);
    if (receipt?.command.accountGuid === accountGuid) {
      if (!receipt.value) throw new WorkspaceWriteError('stale-workspace', 'The committed Home receipt is unavailable; inspect the authoritative workspace before continuing.');
      this.recovered.set(operationGuid, { state: 'committed', command: receipt.command, value: receipt.value });
      this.unpublished.delete(operationGuid);
    }
  }
  private identity(owner: HomeOwner) {
    this.requireReady();
    const accountGuid = this.workspace.account()!.guid;
    return { accountGuid, owner: structuredClone(owner), operationGuid: getNewIdbEntry().guid,
      expectedOwnerRevision: this.workspace.homeOwners().find(record => sameHomeOwner(homeRecordOwner(record), owner))?.revision ?? null };
  }
  private recordIdentity(record: Readonly<IdbHomeDashboard>) {
    this.requireReady(record.accountId);
    return this.identity(homeRecordOwner(record));
  }
  private requireReady(accountGuid = this.workspace.account()?.guid): void {
    if (!this.workspace.isReady() || !accountGuid || this.workspace.account()?.guid !== accountGuid)
      throw new WorkspaceWriteError('stale-workspace', 'Select the ready owning account before using Home commands.');
  }
}
