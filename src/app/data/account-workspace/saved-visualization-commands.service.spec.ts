import { vi } from 'vitest';
import { utilityVisualizationFixture } from '@domain/visualizations/testing/visualization-fixtures';
import { IdbSavedVisualization } from '@data/models/idbModels/saved-visualization';
import { SavedVisualizationCommands } from './saved-visualization-commands.service';
import { WorkspaceWriteError } from './workspace-commands.models';
import { VisualizationConflictError } from './visualization-commands.models';

describe('saved visualization command outcomes', () => {
  const record: IdbSavedVisualization = { guid: 'visualization-a', accountId: 'account-a', revision: 1, recordVersion: 1,
    createdDate: '2026-11-11T00:00:00.000Z', modifiedDate: '2026-11-11T00:00:00.000Z', definition: utilityVisualizationFixture() };
  function setup() {
    const boundary = { execute: vi.fn(async (_options, persist) => ({ value: await persist() })), recoverCommittedPublication: vi.fn(async () => {}) };
    const handler = { create: vi.fn(async (_command: unknown, _account: string) => structuredClone(record)), update: vi.fn(async () => structuredClone(record)),
      duplicate: vi.fn(async () => structuredClone(record)), delete: vi.fn(async () => {}), inspect: vi.fn(async () => []) };
    const workspace = { account: () => ({ guid: 'account-a' }), isReady: () => true, savedVisualizations: () => [record], snapshot: () => undefined };
    return { boundary, handler, workspace, commands: new SavedVisualizationCommands(boundary as any, handler as any, workspace as any) };
  }

  it('assigns independent identities once and retains a cloned failed proposal for retry', async () => {
    const { commands, handler } = setup();
    const definition = utilityVisualizationFixture();
    const command = commands.prepareCreate(definition);
    const duplicate = commands.prepareDuplicate(record);
    expect(duplicate.guid).not.toBe(command.guid);
    expect(duplicate.definition).toEqual({ ...definition, name: `${definition.name} (Copy)` });
    handler.create.mockRejectedValueOnce(new Error('Quota exceeded'));
    const result = await commands.submit(command);
    expect(result.state).toBe('failed');
    expect(result.command).toEqual(command);
    expect(result.command).not.toBe(command);
    (definition as any).name = 'Newer draft';
    expect((result.command as typeof command).definition.name).not.toBe('Newer draft');
    await commands.submit(result.command);
    expect(handler.create.mock.calls.map(call => (call[0] as typeof command).guid)).toEqual([command.guid, command.guid]);
  });

  it('returns saved-versus-local conflicts without discarding either value', async () => {
    const { commands, handler } = setup();
    const command = { kind: 'update' as const, guid: record.guid, accountGuid: record.accountId, expectedRevision: 1, definition: utilityVisualizationFixture() };
    const current = { ...record, revision: 2 };
    handler.update.mockRejectedValueOnce(new VisualizationConflictError(current));
    const result = await commands.submit(command);
    expect(result).toMatchObject({ state: 'conflict', current, command });
  });

  it('distinguishes committed publication failure and recovers without replaying the write', async () => {
    const { commands, handler, boundary } = setup();
    boundary.execute.mockImplementationOnce(async (_options, persist) => {
      await persist(); throw new WorkspaceWriteError('persistence-failed', 'Refresh failed', undefined, true);
    });
    const command = commands.prepareCreate(utilityVisualizationFixture());
    expect(await commands.submit(command)).toMatchObject({ state: 'refresh-required', command });
    expect(await commands.submit(command)).toMatchObject({ state: 'refresh-required', command });
    expect(await commands.recover(record.accountId, record.guid)).toMatchObject({ state: 'valid', record });
    expect(handler.create).toHaveBeenCalledTimes(1);
    expect(boundary.recoverCommittedPublication).toHaveBeenCalledWith(record.accountId);
  });

  it('does not submit writes or restore departed selections after an account switch', async () => {
    const { commands, handler, workspace } = setup();
    workspace.account = () => ({ guid: 'account-b' });
    expect(await commands.submit(commands.prepareCreate(utilityVisualizationFixture()))).toMatchObject({ state: 'failed' });
    expect(handler.create).not.toHaveBeenCalled();
    await expect(commands.recover('account-a', record.guid)).rejects.toMatchObject({ code: 'stale-workspace' });
  });
});
