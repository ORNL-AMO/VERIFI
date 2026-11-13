import { Injectable } from '@angular/core';
import { IndexedDbTransactionContext, IndexedDbTransactionService } from '@data/indexedDB/indexed-db-transaction.service';
import { VerifiStoreName } from '@data/indexedDB/indexed-db-schema';
import { getNewIdbSavedVisualization, IdbSavedVisualization, SAVED_VISUALIZATION_RECORD_VERSION } from '@data/models/idbModels/savedVisualization';
import { readSavedVisualization, savedVisualizationEnvelopeError } from '@data/visualizations/saved-visualization-record';
import { normalizeVisualizationDefinition, VisualizationDefinition, VisualizationFacilitySelection } from '@domain/visualizations/visualization-definition';
import { decodeVisualizationDefinition } from '@domain/visualizations/visualization-validation';
import { prepareVisualizationFacilityChange } from '@domain/visualizations/visualization-facility-change';
import { sameVisualizationFacilitySelection } from '@domain/visualizations/visualization-facilities';
import { VisualizationReference, VisualizationReferenceIssue, visualizationReferences } from '@domain/visualizations/visualization-references';
import { WorkspaceWriteError } from '../workspace-commands.models';
import { CreateVisualizationCommand, DeleteVisualizationCommand, DuplicateVisualizationCommand,
  UpdateVisualizationCommand, RetargetVisualizationCommand, VisualizationConflictError } from '../visualization-commands.models';
import { inspectVisualizationReferences, VisualizationCatalogResource, VisualizationReferenceCatalog, readVisualizationReferenceCatalog, VISUALIZATION_CATALOG_STORES } from '../visualization-reference-inspection';

const OWNER_STORES: readonly VerifiStoreName[] = ['accounts', 'facilities', 'savedVisualizations'];
const CATALOG_STORES = VISUALIZATION_CATALOG_STORES;

@Injectable({ providedIn: 'root' })
export class VisualizationCommandHandler {
  constructor(private readonly transactions: IndexedDbTransactionService) { }

  async create(command: CreateVisualizationCommand, activeAccountGuid: string): Promise<IdbSavedVisualization> {
    const submitted = structuredClone(command);
    return this.transactions.runTransaction(OWNER_STORES, 'readwrite', async tx => {
      await this.assertOwner(tx, submitted.accountGuid, activeAccountGuid);
      this.assertDefinition(submitted.definition, submitted.accountGuid);
      await this.assertFacilitiesExist(tx, submitted.definition);
      return this.addOnce(tx, submitted);
    });
  }

  async duplicate(command: DuplicateVisualizationCommand, activeAccountGuid: string): Promise<IdbSavedVisualization> {
    const submitted = structuredClone(command);
    return this.transactions.runTransaction(OWNER_STORES, 'readwrite', async tx => {
      await this.assertOwner(tx, submitted.accountGuid, activeAccountGuid);
      this.assertDefinition(submitted.definition, submitted.accountGuid);
      // A retry after a successful creation must not depend on whether the original changed later.
      const existing = await this.find(tx, submitted.guid);
      if (existing) return this.matchCreation(existing, submitted);
      const source = await this.requireCurrent(tx, submitted.sourceGuid, submitted.accountGuid, submitted.expectedRevision);
      const decoded = readSavedVisualization(source);
      if (decoded.state !== 'valid' && decoded.state !== 'setup-required') this.invalid('Repair this visualization before duplicating it.');
      if (!sameVisualizationFacilitySelection(decoded.definition.facilitySelection, submitted.definition.facilitySelection)) this.invalid('Duplicate retains the original facility selection.');
      const expected = { ...decoded.definition, name: submitted.definition.name };
      if (!sameDefinitionIntent(expected, submitted.definition)) throw new VisualizationConflictError(source);
      await this.assertFacilitiesExist(tx, submitted.definition);
      return this.addOnce(tx, submitted);
    });
  }

  async update(command: UpdateVisualizationCommand, activeAccountGuid: string): Promise<IdbSavedVisualization> {
    const submitted = structuredClone(command);
    return this.transactions.runTransaction([...new Set([...OWNER_STORES, ...CATALOG_STORES])], 'readwrite', async tx => {
      await this.assertOwner(tx, submitted.accountGuid, activeAccountGuid);
      this.assertDefinition(submitted.definition, submitted.accountGuid);
      const current = await this.requireCurrent(tx, submitted.guid, submitted.accountGuid, submitted.expectedRevision);
      const state = readSavedVisualization(current);
      const payload = decodeVisualizationDefinition(current.definition);
      const readableCurrent = current.recordVersion === SAVED_VISUALIZATION_RECORD_VERSION && !current.preservation?.locked
        && 'definition' in payload && payload.definition.accountGuid === current.accountId;
      // Preserved resource issues block activation, not knowledge of the current inclusion intent.
      if (readableCurrent && !sameVisualizationFacilitySelection(payload.definition.facilitySelection, submitted.definition.facilitySelection))
        this.invalid('Use the reviewed facility selection command to change included facilities.');
      const blocked = current.preservation?.references ?? [];
      if (state.state === 'unsupported' && current.recordVersion !== SAVED_VISUALIZATION_RECORD_VERSION)
        this.invalid('This record needs a newer VERIFI version.');
      const needsReplacement = current.preservation?.locked || state.state === 'invalid' || state.state === 'unsupported' || !('definition' in payload);
      if (needsReplacement && !submitted.repair?.acknowledgeTransfer) this.invalid('Explicitly review the preserved payload before replacing it.');
      const acknowledged = new Set(submitted.repair?.referencePaths ?? []);
      const remaining = blocked.filter(ref => !acknowledged.has(ref.path));
      if (needsReplacement || acknowledged.size) {
        const issues = inspectVisualizationReferences(submitted.definition, await readVisualizationReferenceCatalog(tx));
        if (needsReplacement ? issues.length > 0 : issues.some(ref => acknowledged.has(ref.path)))
          this.invalid('Reviewed replacement sources must belong to the saved scope and be available.');
      }
      const next: IdbSavedVisualization = { ...current, revision: current.revision + 1,
        modifiedDate: new Date(), definition: submitted.definition };
      delete next.facilityId;
      if (remaining.length) next.preservation = { references: remaining, transfers: current.preservation?.transfers ?? [] };
      else delete next.preservation;
      await tx.put('savedVisualizations', next);
      return next;
    });
  }

  async retarget(command: RetargetVisualizationCommand, activeAccountGuid: string): Promise<IdbSavedVisualization> {
    const submitted = structuredClone(command);
    return this.transactions.runTransaction([...new Set([...OWNER_STORES, ...CATALOG_STORES])], 'readwrite', async tx => {
      await this.assertOwner(tx, submitted.accountGuid, activeAccountGuid);
      const current = await this.requireCurrent(tx, submitted.guid, submitted.accountGuid, submitted.expectedRevision);
      const decoded = decodeVisualizationDefinition(current.definition);
      if (savedVisualizationEnvelopeError(current) || current.recordVersion !== SAVED_VISUALIZATION_RECORD_VERSION
        || current.preservation?.locked || !('definition' in decoded)) this.invalid('Repair this visualization before changing its facilities.');
      this.assertDefinition({ ...decoded.definition, facilitySelection: submitted.targetFacilities }, submitted.accountGuid);
      this.assertDefinition(submitted.reviewedDefinition, submitted.accountGuid);
      if (sameVisualizationFacilitySelection(decoded.definition.facilitySelection, submitted.targetFacilities)) {
        if (!sameDefinitionIntent(normalizeVisualizationDefinition(decoded.definition), normalizeVisualizationDefinition(submitted.reviewedDefinition))) throw new VisualizationConflictError(current);
        return current;
      }
      const catalog = await readVisualizationReferenceCatalog(tx);
      await this.assertFacilitiesExist(tx, { ...decoded.definition, facilitySelection: submitted.targetFacilities }, decoded.definition.facilitySelection);
      const definition = prepareVisualizationFacilityChange(decoded.definition, submitted.targetFacilities, catalog).definition;
      this.assertDefinition(definition, submitted.accountGuid);
      if (!sameDefinitionIntent(normalizeVisualizationDefinition(definition), normalizeVisualizationDefinition(submitted.reviewedDefinition))) throw new VisualizationConflictError(current);
      const next: IdbSavedVisualization = { ...current, revision: current.revision + 1, modifiedDate: new Date(), definition };
      delete next.facilityId;
      if (current.preservation) next.preservation = { ...current.preservation,
        references: reconcileRetargetReferences(decoded.definition, definition, current.preservation.references, catalog) };
      await tx.put('savedVisualizations', next);
      return next;
    });
  }

  async delete(command: DeleteVisualizationCommand, activeAccountGuid: string): Promise<void> {
    const submitted = structuredClone(command);
    return this.transactions.runTransaction(OWNER_STORES, 'readwrite', async tx => {
      await this.assertOwner(tx, submitted.accountGuid, activeAccountGuid);
      const current = await this.requireCurrent(tx, submitted.guid, submitted.accountGuid, submitted.expectedRevision);
      await tx.deleteByKey('savedVisualizations', current.id!);
    });
  }

  async inspect(record: Readonly<IdbSavedVisualization>): Promise<readonly VisualizationReferenceIssue[]> {
    const decoded = readSavedVisualization(record);
    if (decoded.state !== 'valid' && decoded.state !== 'setup-required') return record.preservation?.references ?? [];
    return this.transactions.runTransaction(CATALOG_STORES, 'readonly', async tx =>
      inspectVisualizationReferences(decoded.definition, await readVisualizationReferenceCatalog(tx), record.preservation?.references));
  }

  private async addOnce(tx: IndexedDbTransactionContext, command: CreateVisualizationCommand | DuplicateVisualizationCommand): Promise<IdbSavedVisualization> {
    if (!command.guid?.trim() || !Number.isFinite(new Date(command.createdDate).getTime())) this.invalid('A stable identity and creation date are required.');
    const existing = await this.find(tx, command.guid);
    if (existing) return this.matchCreation(existing, command);
    const createdDate = new Date(command.createdDate);
    const record = getNewIdbSavedVisualization(command.definition, {
      guid: command.guid, createdDate, modifiedDate: createdDate
    });
    record.id = await tx.add('savedVisualizations', record) as number;
    return record;
  }

  private matchCreation(record: IdbSavedVisualization, command: CreateVisualizationCommand | DuplicateVisualizationCommand): IdbSavedVisualization {
    if (record.accountId !== command.accountGuid || record.revision !== 1 || !sameDefinitionIntent(record.definition, command.definition)
      || new Date(record.createdDate).getTime() !== new Date(command.createdDate).getTime()) throw new VisualizationConflictError(record.accountId === command.accountGuid ? record : undefined);
    return record;
  }

  private async requireCurrent(tx: IndexedDbTransactionContext, guid: string, accountGuid: string, revision: number): Promise<IdbSavedVisualization> {
    const record = await this.find(tx, guid);
    if (!record || record.accountId !== accountGuid || record.id === undefined || record.revision !== revision)
      throw new VisualizationConflictError(record?.accountId === accountGuid ? record : undefined);
    return record;
  }

  private async find(tx: IndexedDbTransactionContext, guid: string): Promise<IdbSavedVisualization | undefined> {
    const records = await tx.getAllByIndex<IdbSavedVisualization>('savedVisualizations', 'guid', guid);
    if (records.length > 1) this.invalid('The visualization identity is ambiguous.');
    return records[0];
  }

  private async assertOwner(tx: IndexedDbTransactionContext, accountGuid: string, activeAccountGuid: string): Promise<void> {
    if (accountGuid !== activeAccountGuid) throw new WorkspaceWriteError('cross-account-entity', 'This visualization belongs to another account.');
    const accounts = await tx.getAllByIndex<{ deleteAccount?: boolean }>('accounts', 'guid', accountGuid);
    if (accounts.length !== 1 || accounts[0].deleteAccount) this.invalid('The visualization account is no longer available.');
  }

  private async assertFacilitiesExist(tx: IndexedDbTransactionContext, definition: VisualizationDefinition,
    retainedSelection?: VisualizationFacilitySelection): Promise<void> {
    const facilities = await tx.getAllByIndex<VisualizationCatalogResource>('facilities', 'accountId', definition.accountGuid);
    if (definition.facilitySelection.kind === 'all') {
      if (!facilities.length) this.invalid('Add a facility before choosing All Facilities.');
      return;
    }
    for (const guid of definition.facilitySelection.facilityGuids) {
      if (facilities.some(facility => facility.guid === guid)) continue;
      const retained = retainedSelection?.kind === 'fixed' && retainedSelection.facilityGuids.includes(guid);
      // Existing unresolved identities remain repairable intent, but a foreign record is never eligible.
      if (retained && !(await tx.getAllByIndex<VisualizationCatalogResource>('facilities', 'guid', guid)).length) continue;
      this.invalid('Included facilities must belong to the active account and be available.');
    }
  }

  private assertDefinition(definition: unknown, accountGuid: string): asserts definition is VisualizationDefinition {
    const decoded = decodeVisualizationDefinition(definition);
    if (decoded.state === 'invalid' || decoded.state === 'unsupported') this.invalid('The visualization definition is malformed or unsupported.');
    if ((definition as VisualizationDefinition).accountGuid !== accountGuid) this.invalid('The visualization definition belongs to another account.');
  }

  private invalid(message: string): never { throw new WorkspaceWriteError('validation-failed', message); }
}

/** Preserve repair identity across array pruning; ordinal paths are not source identities. */
function reconcileRetargetReferences(before: VisualizationDefinition, after: VisualizationDefinition,
  issues: readonly VisualizationReferenceIssue[], catalog: VisualizationReferenceCatalog): readonly VisualizationReferenceIssue[] {
  const oldRefs = visualizationReferences(before), newRefs = visualizationReferences(after);
  const selected = new Set(after.facilitySelection.kind === 'fixed' ? after.facilitySelection.facilityGuids
    : catalog.facilities.filter(item => item.accountId === after.accountGuid).map(item => item.guid));
  const resourceFor = (ref: VisualizationReference): VisualizationCatalogResource | undefined => {
    const resources = ref.kind === 'facility' ? catalog.facilities : ref.kind === 'meter' || ref.kind === 'charge' ? catalog.meters
      : ref.kind === 'meter-group' ? catalog.meterGroups : ref.kind === 'predictor' ? catalog.predictors
      : ref.kind === 'energy-use-group' ? catalog.energyUseGroups : ref.kind === 'equipment' ? catalog.energyUseEquipment
      : ref.kind === 'model' ? catalog.facilityAnalyses : ref.kind === 'analysis' ? [...catalog.facilityAnalyses, ...catalog.accountAnalyses] : [];
    const guid = ref.kind === 'model' || ref.kind === 'charge' ? ref.parentGuid : ref.guid;
    return resources.find(item => item.guid === guid);
  };
  return issues.flatMap(issue => {
    const old = oldRefs.find(ref => ref.path === issue.path && referenceIdentity(before, ref) === referenceIdentity(before, issue));
    if (!old) return [issue]; // Unclassified preservation cannot be acknowledged by an unrelated inclusion edit.
    const next = newRefs.find(ref => referenceIdentity(after, ref) === referenceIdentity(before, old));
    const facilityChoice = old.path.startsWith('facilitySelection.facilityGuids.');
    const resource = resourceFor(old);
    if (facilityChoice && (!next || resource?.accountId === after.accountGuid && selected.has(old.guid))) return [];
    const excluded = resource?.accountId === after.accountGuid
      && (!old.accountGuid || old.accountGuid === after.accountGuid)
      && (old.kind === 'facility' ? !selected.has(resource.guid) : resource.facilityId !== undefined && !selected.has(resource.facilityId));
    if (!next && excluded) return [];
    return [{ ...issue, ...(next ? { path: next.path } : {}) }];
  });
}

function referenceIdentity(definition: VisualizationDefinition, ref: VisualizationReference): string {
  const parts = ref.path.split('.');
  const container = parts[0] === 'sources' ? ['source', definition.sources[Number(parts[1])]?.id]
    : parts[0] === 'series' ? ['series', definition.series[Number(parts[1])]?.id] : ['definition'];
  const fields = (parts[0] === 'sources' || parts[0] === 'series' ? parts.slice(2) : parts).filter(part => !/^\d+$/.test(part));
  return JSON.stringify([container, fields, ref.kind, ref.guid, ref.parentGuid, ref.groupGuid,
    ref.optional ? ref.accountGuid ?? definition.accountGuid : undefined]);
}

/** Compare current definition intent independently of JSON object-key order. */
function sameDefinitionIntent(left: unknown, right: unknown): boolean {
  const a = decodeVisualizationDefinition(left), b = decodeVisualizationDefinition(right);
  return 'definition' in a && 'definition' in b && sameJson(a.definition, b.definition);
}

/** Definitions have a closed decoder-approved JSON shape; object key order is not semantic. */
function sameJson(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every(key => Object.hasOwn(b, key) && sameJson(a[key], b[key]));
}
