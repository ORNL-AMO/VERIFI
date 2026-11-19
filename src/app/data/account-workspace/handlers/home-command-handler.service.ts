import { Injectable } from '@angular/core';
import { HOME_STARTERS, HomeDashboardDefinition, HomeOwner, HomeOwnerState, resolveHomeDefault, sameHomeOwner } from '@domain/home/home-dashboard';
import { decodeHomeDashboard, decodeHomeOwnerState, homePositiveInteger, homeText } from '@domain/home/home-validation';
import { homeOwnerValid } from '@domain/home/home-bindings';
import { decodeVisualizationDefinition } from '@domain/visualizations/visualization-validation';
import { normalizeVisualizationDefinition } from '@domain/visualizations/visualization-definition';
import { serializeVisualizationDefinition } from '@domain/visualizations/visualization-source-groups';
import { IndexedDbTransactionContext, IndexedDbTransactionService } from '@data/indexedDB/indexed-db-transaction.service';
import { getNewIdbHomeDashboard, getNewIdbHomeOwner, homeRecordOwner, IdbHomeDashboard, IdbHomeOwner, HomeReferenceIssue } from '@data/models/idbModels/homeDashboard';
import { getNewIdbSavedVisualization, IdbSavedVisualization } from '@data/models/idbModels/savedVisualization';
import { IdbAccount } from '@data/models/idbModels/account';
import { readHomeDashboard, readHomeOwner } from '@data/home/home-record';
import { duplicateHomeReferenceIssues, homeDashboardVisible, homeOwnerResolutionState, homeReferences, sameHomeJson } from '@data/home/home-references';
import { HomeGraphProposal } from '@data/home/home-template-graph';
import { HomeCommand, HomeCommandValue, HomeConflictError } from '../home-commands.models';
import { WorkspaceWriteError } from '../workspace-commands.models';
import { readVisualizationReferenceCatalog, VISUALIZATION_CATALOG_STORES, VisualizationReferenceCatalog } from '../visualization-reference-inspection';

type Tx = IndexedDbTransactionContext;

/** All graph checks and writes share one native transaction. The application boundary owns publication. */
@Injectable({ providedIn: 'root' })
export class HomeCommandHandler {
  constructor(private readonly transactions: IndexedDbTransactionService) { }

  execute(command: HomeCommand, activeAccountGuid: string): Promise<HomeCommandValue> {
    const submitted = structuredClone(command);
    return this.transactions.runTransaction(['accounts', 'homeOwners', 'homeDashboards', 'savedVisualizations', ...VISUALIZATION_CATALOG_STORES], 'readwrite', async tx => {
      const account = await this.assertOwner(tx, submitted.accountGuid, submitted.owner, activeAccountGuid);
      if (!homeText(submitted.operationGuid)) invalid('A stable Home operation identity is required.');
      const allOwners = await tx.getAllByIndex<IdbHomeOwner>('homeOwners', 'accountId', submitted.accountGuid);
      const matching = allOwners.filter(record => sameHomeOwner(homeRecordOwner(record), submitted.owner));
      if (matching.length > 1) invalid('This Home owner identity is ambiguous.');
      let owner = matching[0];
      const ownerRead = owner ? readHomeOwner(owner) : undefined;
      if (ownerRead && ownerRead.state !== 'valid') invalid('This preserved Home owner needs review or a compatible VERIFI version.');
      const state: HomeOwnerState = ownerRead?.state === 'valid' ? ownerRead.value
        : { version: 1, initialized: false, dashboardOrder: [], deletedStarters: [] };
      const resolution = owner ? homeOwnerResolutionState(owner, state) : state;
      const dashboards = (await tx.getAllByIndex<IdbHomeDashboard>('homeDashboards', 'accountId', submitted.accountGuid))
        .filter(record => sameHomeOwner(homeRecordOwner(record), submitted.owner));
      if (submitted.kind === 'initialize' && state.initialized) return { owner, changed: false, skipped: 'initialized' };

      // Stable creation retries cannot depend on a source/default revision that changed after commit.
      if (submitted.kind === 'create' && submitted.graph.dashboards.length === 1) {
        const existing = dashboards.find(record => record.guid === submitted.graph.dashboards[0].guid);
        if (existing) {
          this.assertGraph(submitted.graph, submitted, false);
          if (!owner || existing.creationOperationGuid !== submitted.operationGuid || existing.revision !== 1
            || existing.template?.automatic !== false
            || existing.template?.template !== submitted.graph.dashboards[0].template || existing.template.version !== submitted.graph.dashboards[0].templateVersion
            || !sameHomeJson(existing.definition, { ...submitted.graph.dashboards[0].definition, visibility: 'always' })
            || new Date(existing.createdDate).getTime() !== new Date(submitted.graph.createdDate).getTime()) throw new HomeConflictError(owner, existing);
          for (const proposed of submitted.graph.charts) {
            const matches = await tx.getAllByIndex<IdbSavedVisualization>('savedVisualizations', 'guid', proposed.guid);
            const chart = matches[0];
            if (matches.length !== 1 || chart.accountId !== submitted.accountGuid || chart.revision !== 1 || chart.homeOrigin?.operationGuid !== submitted.operationGuid
              || !sameHomeJson(chart.definition, serializeVisualizationDefinition(normalizeVisualizationDefinition(proposed.definition)))) throw new HomeConflictError(owner, existing);
          }
          return { owner, dashboard: existing, changed: false };
        }
      }
      if ((owner?.revision ?? null) !== submitted.expectedOwnerRevision) throw new HomeConflictError(owner);
      const catalog = await readVisualizationReferenceCatalog(tx);
      const charts = await tx.getAll<IdbSavedVisualization>('savedVisualizations');
      const visible = (records: readonly IdbHomeDashboard[]) => records.filter(record => homeDashboardVisible(record, { account, meters: catalog.meters })).map(record => record.guid);
      const writeOwner = async (next: HomeOwnerState, acknowledgeReferences = false): Promise<IdbHomeOwner> => {
        if (owner) {
          const preservation = owner.preservation && acknowledgeReferences ? { ...owner.preservation,
            references: owner.preservation.references.filter(ref => ref.path !== 'defaultDashboardGuid' && !ref.path.startsWith('dashboardOrder.')) } : owner.preservation;
          if (sameHomeJson(owner.state, next) && sameHomeJson(owner.preservation, preservation)) return owner;
          owner = { ...owner, state: structuredClone(next), revision: owner.revision + 1, modifiedDate: new Date(), ...(preservation ? { preservation } : {}) };
          await tx.put('homeOwners', owner);
        } else {
          owner = getNewIdbHomeOwner(submitted.accountGuid, submitted.owner, next);
          owner.id = await tx.add('homeOwners', owner) as number;
        }
        return owner;
      };
      if (submitted.kind === 'initialize' || submitted.kind === 'create') {
        // Backups containing dashboards but no owner marker are adopted without adding another starter set.
        if (submitted.kind === 'initialize' && dashboards.length) {
          const order = completeOrder(resolution.dashboardOrder, dashboards);
          const adopted = { ...state, initialized: true, dashboardOrder: order };
          return { owner: await writeOwner(withDefault(adopted, resolveHomeDefault(adopted, visible(dashboards)))), changed: true };
        }
        this.assertGraph(submitted.graph, submitted, submitted.kind === 'initialize');
        const added = await this.addGraph(tx, submitted, submitted.graph, catalog, charts);
        const order = [...completeOrder(resolution.dashboardOrder, dashboards), ...added.map(record => record.guid)];
        const next = { ...state, initialized: true, dashboardOrder: order };
        const preferred = resolution.defaultDashboardGuid ?? (submitted.kind === 'initialize'
          ? added.find(record => record.template?.template === 'home')?.guid : undefined);
        const nextState = withDefault(next, resolveHomeDefault({ ...next, ...(preferred ? { defaultDashboardGuid: preferred } : {}) }, visible([...dashboards, ...added])));
        return { owner: await writeOwner(nextState), dashboard: added[0], changed: true };
      }
      if (!owner || !state.initialized) invalid('Initialize or adopt the Home owner before editing it.');
      if (submitted.kind === 'configure') {
        const read = decodeHomeOwnerState(submitted.state);
        if (read.state !== 'valid' || !read.value.initialized || !sameHomeJson(read.value.deletedStarters, state.deletedStarters)
          || !sameSet(read.value.dashboardOrder, dashboards.map(record => record.guid))
          || read.value.defaultDashboardGuid !== undefined && !visible(dashboards).includes(read.value.defaultDashboardGuid)) invalid('Choose this owner’s complete dashboard order and an available default.');
        const revision = owner.revision, configured = await writeOwner(read.value, true);
        return { owner: configured, changed: configured.revision !== revision };
      }
      const guid = submitted.kind === 'duplicate' ? submitted.sourceGuid : submitted.guid;
      const current = dashboards.find(record => record.guid === guid);
      if (!current || current.id === undefined || current.revision !== submitted.expectedRevision) throw new HomeConflictError(owner, current);
      if (submitted.kind === 'delete') {
        await tx.deleteByKey('homeDashboards', current.id);
        const remaining = dashboards.filter(record => record.guid !== current.guid);
        const automaticTemplate = readHomeDashboard(current).state === 'valid' && current.template?.automatic ? current.template.template : undefined;
        const deletedStarters = automaticTemplate ? [...new Set([...state.deletedStarters, automaticTemplate])] : state.deletedStarters;
        let next: HomeOwnerState = { ...state, dashboardOrder: completeOrder(state.dashboardOrder, remaining), deletedStarters };
        if (state.defaultDashboardGuid === current.guid) next = withDefault(next, resolveHomeDefault(withDefault(next, undefined), visible(remaining)));
        return { owner: await writeOwner(next), changed: true };
      }
      const read = readHomeDashboard(current);
      if (read.state !== 'valid') invalid('Preserve this dashboard until its format and relationships can be reviewed.');
      if (submitted.kind === 'duplicate') {
        if (!homeText(submitted.name) || !homeText(submitted.guid) || submitted.guid === current.guid || !validDate(submitted.createdDate)
          || !sameSet(Object.keys(submitted.widgetIds), read.value.widgets.map(widget => widget.id))
          || !Object.values(submitted.widgetIds).every(homeText) || new Set(Object.values(submitted.widgetIds)).size !== read.value.widgets.length
          || Object.values(submitted.widgetIds).some(id => read.value.widgets.some(widget => widget.id === id)))
          invalid('Duplicate needs stable, independent dashboard and widget identities.');
        await this.assertUnused(tx, 'homeDashboards', submitted.guid);
        const definition = { ...read.value, name: submitted.name, visibility: 'always' as const,
          widgets: read.value.widgets.map(widget => ({ ...widget, id: submitted.widgetIds[widget.id] })) };
        const date = new Date(submitted.createdDate);
        const duplicate = getNewIdbHomeDashboard(submitted.accountGuid, submitted.owner, definition, { guid: submitted.guid, createdDate: date, modifiedDate: date });
        duplicate.creationOperationGuid = submitted.operationGuid;
        if (current.template) duplicate.template = { ...structuredClone(current.template), automatic: false, customized: true };
        if (current.preservation) duplicate.preservation = { ...structuredClone(current.preservation),
          references: duplicateHomeReferenceIssues(read.value, current.preservation.references, submitted.widgetIds) };
        duplicate.id = await tx.add('homeDashboards', duplicate) as number;
        return { owner: await writeOwner({ ...state, dashboardOrder: [...completeOrder(state.dashboardOrder, dashboards), duplicate.guid] }), dashboard: duplicate, changed: true };
      }
      if (submitted.kind === 'update') {
        this.assertDefinition(submitted.definition, submitted, catalog, charts, current);
        const acknowledged = new Set(submitted.repairPaths ?? []);
        const references = current.preservation?.references ?? [];
        for (const path of acknowledged) {
          if (!references.some(ref => ref.path === path)) invalid('Only reviewed blocked references may be acknowledged.');
          const ref = homeReferences(submitted.definition).find(ref => ref.path === path);
          if (ref && !this.referenceAvailable(ref, submitted.accountGuid, catalog, charts)) invalid('Choose an available same-account replacement before acknowledging this reference.');
        }
        const nextReferences = homeReferences(submitted.definition), formerReferences = homeReferences(read.value);
        const remaining = references.filter(ref => !acknowledged.has(ref.path)
          && (!formerReferences.some(previous => previous.path === ref.path) || nextReferences.some(next => next.path === ref.path)));
        if (sameHomeJson(read.value, submitted.definition) && sameHomeJson(remaining, references)) return { owner, dashboard: current, changed: false };
        const next: IdbHomeDashboard = { ...current, definition: structuredClone(submitted.definition), revision: current.revision + 1, modifiedDate: new Date(),
          ...(current.template ? { template: { ...current.template, customized: true } } : {}) };
        if (current.preservation) next.preservation = { ...current.preservation, references: remaining };
        await tx.put('homeDashboards', next);
        const all = dashboards.map(record => record.guid === next.guid ? next : record);
        const nextState = state.defaultDashboardGuid === next.guid && !visible(all).includes(next.guid)
          ? withDefault(state, resolveHomeDefault(withDefault(state, undefined), visible(all))) : state;
        return { owner: await writeOwner(nextState), dashboard: next, changed: true };
      }
      this.assertGraph(submitted.graph, submitted, false);
      const proposal = submitted.graph.dashboards[0];
      if (proposal.guid !== current.guid) invalid('Template replacement must retain the dashboard identity.');
      if (submitted.kind === 'upgrade' && (!current.template?.automatic || current.template.customized
        || current.preservation?.references.length || current.template.template !== proposal.template || current.template.version >= proposal.templateVersion
        || !sameHomeJson(current.template.baseline, read.value)
        || !sameSet(current.template.chartBaselines.map(chart => chart.guid), homeReferences(read.value).filter(ref => ref.kind === 'visualization').map(ref => ref.guid))
        || current.template.chartBaselines.some(baseline => !charts.some(chart => chart.guid === baseline.guid && chart.revision === baseline.revision && !chart.preservation?.locked && !chart.preservation?.references.length))))
        return { owner, dashboard: current, changed: false, skipped: 'protected' };
      const [restored] = await this.addGraph(tx, submitted, submitted.graph, catalog, charts, current);
      return { owner, dashboard: restored, changed: true };
    });
  }

  private async assertOwner(tx: Tx, accountGuid: string, owner: HomeOwner, active: string): Promise<IdbAccount> {
    if (accountGuid !== active) throw new WorkspaceWriteError('cross-account-entity', 'Select the owning Home account before saving.');
    if (!homeOwnerValid(owner) || owner.kind === 'account' && owner.guid !== accountGuid) invalid('Invalid Home owner.');
    const accounts = await tx.getAllByIndex<IdbAccount>('accounts', 'guid', accountGuid);
    if (accounts.length !== 1 || accounts[0].deleteAccount) invalid('The Home account is no longer available.');
    if (owner.kind === 'facility') {
      const facilities = await tx.getAllByIndex<{ accountId: string }>('facilities', 'guid', owner.guid);
      if (facilities.length !== 1 || facilities[0].accountId !== accountGuid) invalid('The Home facility is no longer available in this account.');
    }
    return accounts[0];
  }

  private assertGraph(graph: HomeGraphProposal, command: HomeCommand, initialize: boolean): void {
    if (!graph || !validDate(graph.createdDate) || !Array.isArray(graph.charts) || !Array.isArray(graph.dashboards)
      || (initialize ? !sameHomeJson(graph.dashboards.map(item => item.template), [...HOME_STARTERS]) : graph.dashboards.length !== 1)
      || !graph.dashboards.every(item => homeText(item.guid) && homePositiveInteger(item.templateVersion) && [...HOME_STARTERS, 'blank'].includes(item.template))
      || new Set(graph.dashboards.map(item => item.guid)).size !== graph.dashboards.length
      || !graph.charts.every(item => homeText(item.guid)) || new Set(graph.charts.map(item => item.guid)).size !== graph.charts.length)
      invalid('Provide one complete, stable Home template graph.');
    const used = graph.dashboards.flatMap(item => {
      const decoded = decodeHomeDashboard(item.definition);
      if (decoded.state !== 'valid' || item.template === 'blank' && decoded.value.widgets.length) invalid('Invalid Home template layout.');
      return homeReferences(decoded.value).filter(ref => ref.kind === 'visualization').map(ref => ref.guid);
    });
    if (!sameSet(used, graph.charts.map(chart => chart.guid))) invalid('Template widgets and fresh chart definitions must form a complete graph.');
    for (const chart of graph.charts) {
      const decoded = decodeVisualizationDefinition(chart.definition);
      if (!('definition' in decoded) || decoded.definition.accountGuid !== command.accountGuid) invalid('Invalid template chart definition.');
      const selection = decoded.definition.facilitySelection;
      if (command.owner.kind === 'account' ? selection.kind !== 'all' : selection.kind !== 'fixed' || selection.facilityGuids.length !== 1 || selection.facilityGuids[0] !== command.owner.guid)
        invalid('Starter charts must use their explicit owner inclusion.');
      for (const source of decoded.definition.sources) if (source.kind === 'analysis' && source.mode === 'result' && source.reporting
        && !sameHomeOwner(source.reporting.owner, command.owner)) invalid('Starter reporting charts must follow their declared Home owner.');
    }
  }

  private async addGraph(tx: Tx, command: HomeCommand, graph: HomeGraphProposal, catalog: VisualizationReferenceCatalog,
    existingCharts: readonly IdbSavedVisualization[], current?: IdbHomeDashboard): Promise<IdbHomeDashboard[]> {
    const date = new Date(graph.createdDate), addedCharts: IdbSavedVisualization[] = [];
    for (const chart of graph.charts) {
      await this.assertUnused(tx, 'savedVisualizations', chart.guid);
      const record = getNewIdbSavedVisualization(normalizeVisualizationDefinition(chart.definition), { guid: chart.guid, createdDate: date, modifiedDate: date });
      record.homeOrigin = { operationGuid: command.operationGuid, owner: structuredClone(command.owner), templates: graph.dashboards
        .filter(item => homeReferences(item.definition).some(ref => ref.kind === 'visualization' && ref.guid === chart.guid)).map(item => item.template) };
      record.id = await tx.add('savedVisualizations', record) as number;
      addedCharts.push(record);
    }
    const added: IdbHomeDashboard[] = [];
    for (const proposal of graph.dashboards) {
      const definition: HomeDashboardDefinition = { ...proposal.definition,
        visibility: current ? (current.definition as HomeDashboardDefinition).visibility : command.kind === 'initialize' ? proposal.definition.visibility : 'always' };
      this.assertDefinition(definition, command, catalog, [...existingCharts, ...addedCharts]);
      const record = current ? { ...current, definition: structuredClone(definition), revision: current.revision + 1, modifiedDate: new Date() }
        : getNewIdbHomeDashboard(command.accountGuid, command.owner, definition, { guid: proposal.guid, createdDate: date, modifiedDate: date });
      if (!current) record.creationOperationGuid = command.operationGuid;
      const links = new Set(homeReferences(definition).filter(ref => ref.kind === 'visualization').map(ref => ref.guid));
      record.template = { template: proposal.template, version: proposal.templateVersion,
        automatic: current ? !!current.template?.automatic && current.template.template === proposal.template : command.kind === 'initialize', customized: false,
        baseline: structuredClone(definition), chartBaselines: addedCharts.filter(chart => links.has(chart.guid)).map(chart => ({ guid: chart.guid, revision: chart.revision })) };
      delete record.preservation;
      if (current) await tx.put('homeDashboards', record);
      else { await this.assertUnused(tx, 'homeDashboards', record.guid); record.id = await tx.add('homeDashboards', record) as number; }
      added.push(record);
    }
    return added;
  }

  private assertDefinition(definition: HomeDashboardDefinition, command: HomeCommand, catalog: VisualizationReferenceCatalog,
    charts: readonly IdbSavedVisualization[], retained?: IdbHomeDashboard): void {
    const read = decodeHomeDashboard(definition);
    if (read.state !== 'valid') invalid('The Home layout or settings are malformed or unsupported.');
    if (command.owner.kind === 'facility' && read.value.widgets.some(widget => widget.kind === 'map' || widget.kind === 'table' && widget.settings.view === 'facility-progress'))
      invalid('Portfolio maps and facility progress tables require an account dashboard.');
    const old = retained && readHomeDashboard(retained);
    const oldRefs = old?.state === 'valid' ? homeReferences(old.value) : [];
    const acknowledged = command.kind === 'update' ? command.repairPaths ?? [] : [];
    const protectedIntent = (path: string, guid: string) => !acknowledged.includes(path) && oldRefs.some(ref => ref.path === path && ref.guid === guid)
      && retained?.preservation?.references.some(ref => ref.path === path);
    for (const widget of read.value.widgets) {
      const owner = widget.kind === 'goal' && widget.binding.kind === 'reporting' ? widget.binding.owner : widget.kind === 'shortcut' ? widget.destination.owner : undefined;
      const ownerPath = `widgets.${widget.id}.${widget.kind === 'goal' ? 'binding' : 'destination'}.owner.guid`;
      if (owner?.kind === 'account' && owner.guid !== command.accountGuid && !protectedIntent(ownerPath, owner.guid)) invalid('A Home widget cannot refer to another account.');
      if (widget.kind === 'shortcut' && widget.destination.resource && widget.destination.owner.kind === 'facility') {
        const target = this.findReference(widget.destination.resource, catalog, charts);
        if (target && target.facilityId !== widget.destination.owner.guid && !protectedIntent(`widgets.${widget.id}.destination.resource.guid`, widget.destination.resource.guid))
          invalid('The shortcut resource does not belong to its declared facility.');
      }
    }
    for (const ref of homeReferences(read.value)) {
      const existing = this.findReference(ref, catalog, charts);
      if (existing && existing.accountId !== command.accountGuid && !protectedIntent(ref.path, ref.guid)) invalid('A Home widget cannot refer to another account.');
      if (ref.kind === 'visualization' && !existing && !oldRefs.some(old => old.path === ref.path && old.guid === ref.guid)) invalid('Choose an existing same-account saved visualization.');
    }
  }
  private findReference(ref: { kind: HomeReferenceIssue['kind']; guid: string }, catalog: VisualizationReferenceCatalog, charts: readonly IdbSavedVisualization[]) {
    if (ref.kind === 'account') return { guid: ref.guid, accountId: ref.guid, facilityId: undefined };
    const records = ref.kind === 'visualization' ? charts : ref.kind === 'facility' ? catalog.facilities : ref.kind === 'meter' ? catalog.meters
      : ref.kind === 'predictor' ? catalog.predictors : ref.kind === 'equipment' ? catalog.energyUseEquipment : ref.kind === 'analysis' ? [...catalog.facilityAnalyses, ...catalog.accountAnalyses] : [];
    return records.find(record => record.guid === ref.guid);
  }
  private referenceAvailable(ref: { kind: HomeReferenceIssue['kind']; guid: string }, accountGuid: string, catalog: VisualizationReferenceCatalog, charts: readonly IdbSavedVisualization[]): boolean {
    return this.findReference(ref, catalog, charts)?.accountId === accountGuid;
  }
  private async assertUnused(tx: Tx, store: 'homeDashboards' | 'savedVisualizations', guid: string): Promise<void> {
    if ((await tx.getAllByIndex(store, 'guid', guid)).length) invalid('A proposed Home graph identity already exists.');
  }
}

function invalid(message: string): never { throw new WorkspaceWriteError('validation-failed', message); }
function validDate(value: unknown): boolean { return typeof value === 'string' && Number.isFinite(new Date(value).getTime()); }
function sameSet(a: readonly string[], b: readonly string[]): boolean {
  const first = new Set(a), second = new Set(b);
  return first.size === second.size && [...first].every(value => second.has(value));
}
function completeOrder(order: readonly string[], dashboards: readonly IdbHomeDashboard[]): string[] {
  const guids = new Set(dashboards.map(record => record.guid));
  return [...order.filter(guid => guids.has(guid)), ...dashboards.filter(record => !order.includes(record.guid)).map(record => record.guid)];
}
function withDefault(state: HomeOwnerState, guid: string | undefined): HomeOwnerState {
  const { defaultDashboardGuid: _, ...rest } = state;
  return { ...rest, ...(guid ? { defaultDashboardGuid: guid } : {}) };
}
