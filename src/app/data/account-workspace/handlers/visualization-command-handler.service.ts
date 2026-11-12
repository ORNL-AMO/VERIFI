import { Injectable } from '@angular/core';
import { IndexedDbTransactionContext, IndexedDbTransactionService } from '@data/indexedDB/indexed-db-transaction.service';
import { VerifiStoreName } from '@data/indexedDB/indexed-db-schema';
import { getNewIdbSavedVisualization, IdbSavedVisualization, SAVED_VISUALIZATION_RECORD_VERSION } from '@data/models/idbModels/savedVisualization';
import { readSavedVisualization } from '@data/visualizations/saved-visualization-record';
import { VisualizationDefinition } from '@domain/visualizations/visualization-definition';
import { decodeVisualizationDefinition } from '@domain/visualizations/visualization-validation';
import { VisualizationReferenceIssue } from '@domain/visualizations/visualization-references';
import { WorkspaceWriteError } from '../workspace-commands.models';
import { CreateVisualizationCommand, DeleteVisualizationCommand, DuplicateVisualizationCommand,
  UpdateVisualizationCommand, VisualizationConflictError } from '../visualization-commands.models';
import { inspectVisualizationReferences, VisualizationCatalogResource, readVisualizationReferenceCatalog, VISUALIZATION_CATALOG_STORES } from '../visualization-reference-inspection';

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
      await this.assertScopeExists(tx, submitted.definition);
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
      if (!sameScope(source, submitted.definition)) this.invalid('Duplicate retains the original visualization scope.');
      const expected = { ...decoded.definition, name: submitted.definition.name };
      if (!sameDefinitionIntent(expected, submitted.definition)) throw new VisualizationConflictError(source);
      await this.assertScopeExists(tx, submitted.definition);
      return this.addOnce(tx, submitted);
    });
  }

  async update(command: UpdateVisualizationCommand, activeAccountGuid: string): Promise<IdbSavedVisualization> {
    const submitted = structuredClone(command);
    return this.transactions.runTransaction([...new Set([...OWNER_STORES, ...CATALOG_STORES])], 'readwrite', async tx => {
      await this.assertOwner(tx, submitted.accountGuid, activeAccountGuid);
      this.assertDefinition(submitted.definition, submitted.accountGuid);
      const current = await this.requireCurrent(tx, submitted.guid, submitted.accountGuid, submitted.expectedRevision);
      if (!sameScope(current, submitted.definition)) this.invalid('An existing visualization cannot change its owner or scope.');
      const state = readSavedVisualization(current);
      const blocked = current.preservation?.references ?? [];
      if (state.state === 'unsupported' && current.recordVersion !== SAVED_VISUALIZATION_RECORD_VERSION)
        this.invalid('This record needs a newer VERIFI version.');
      const needsReplacement = current.preservation?.locked || state.state === 'invalid' || state.state === 'unsupported';
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
      if (remaining.length) next.preservation = { references: remaining, transfers: current.preservation?.transfers ?? [] };
      else delete next.preservation;
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

  private async assertScopeExists(tx: IndexedDbTransactionContext, definition: VisualizationDefinition): Promise<void> {
    if (definition.scope.kind !== 'facility') return;
    const facilities = await tx.getAllByIndex<VisualizationCatalogResource>('facilities', 'guid', definition.scope.facilityGuid);
    if (facilities.length !== 1 || facilities[0].accountId !== definition.accountGuid) this.invalid('The visualization facility does not belong to this account.');
  }

  private assertDefinition(definition: unknown, accountGuid: string): asserts definition is VisualizationDefinition {
    const decoded = decodeVisualizationDefinition(definition);
    if (decoded.state === 'invalid' || decoded.state === 'unsupported') this.invalid('The visualization definition is malformed or unsupported.');
    if ((definition as VisualizationDefinition).accountGuid !== accountGuid) this.invalid('The visualization definition belongs to another account.');
  }

  private invalid(message: string): never { throw new WorkspaceWriteError('validation-failed', message); }
}

function sameScope(record: Readonly<IdbSavedVisualization>, definition: VisualizationDefinition): boolean {
  return record.accountId === definition.accountGuid && record.facilityId === (definition.scope.kind === 'facility' ? definition.scope.facilityGuid : undefined);
}

/** Historical payloads compare as current intent without rewriting either record. */
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
