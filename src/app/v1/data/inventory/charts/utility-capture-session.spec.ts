import { signal } from '@angular/core';
import { vi } from 'vitest';
import { getNewIdbSavedVisualization } from '@data/models/idbModels/savedVisualization';
import type { CreateVisualizationCommand, VisualizationCommandOutcome } from '@data/account-workspace/visualization-commands.models';
import { utilityVisualizationFixture } from '@domain/visualizations/testing/visualization-fixtures';
import { UtilityCaptureSession } from './utility-capture-session';

describe('inventory capture creation lifecycle', () => {
  function setup() {
    const definition = utilityVisualizationFixture(), record = { ...getNewIdbSavedVisualization(definition), guid: 'capture-a' };
    const command: CreateVisualizationCommand = { kind: 'create', accountGuid: definition.accountGuid, guid: record.guid, definition, createdDate: record.createdDate.toISOString() };
    const account = signal<string | undefined>(definition.accountGuid), ready = signal(true), unregister = vi.fn();
    const prepare = vi.fn(() => command), submit = vi.fn(async (_submitted: CreateVisualizationCommand): Promise<VisualizationCommandOutcome> => ({ state: 'committed', command, value: record, referenceIssues: [] }));
    const recover = vi.fn(async () => ({ state: 'valid' as const, record, definition, issues: [] })), open = vi.fn(async () => true), registerProtection = vi.fn(() => unregister);
    const resolve = vi.fn(() => ({ prepare, submit, recover, open, accountGuid: account, ready, registerProtection }));
    return { session: new UtilityCaptureSession(resolve), definition, command, account, ready, prepare, submit, recover, open, registerProtection, unregister, resolve };
  }
  it('resolves storage dependencies only on capture and retains one identity through rejected-write retries', async () => {
    const state = setup(); expect(state.resolve).not.toHaveBeenCalled();
    state.submit.mockResolvedValueOnce({ state: 'failed', command: state.command, error: new Error('Rejected write') });
    await state.session.start(state.definition);
    expect(state.session.needsProtection()).toBe(true);
    expect(await state.session.resolveLeave()).toBe(false);
    await state.session.start(state.definition);
    expect(state.prepare).toHaveBeenCalledOnce(); expect(state.submit).toHaveBeenCalledOnce();
    await state.session.retry();
    expect(state.submit.mock.calls.map(call => call[0].guid)).toEqual(['capture-a', 'capture-a']);
    expect(state.session.needsProtection()).toBe(false); expect(state.open).toHaveBeenCalledWith('account-a', 'capture-a');
  });
  it('recovers a committed publication without replaying create or allowing discard', async () => {
    const state = setup();
    state.submit.mockResolvedValueOnce({ state: 'refresh-required', command: state.command, error: new Error('Publication failed') });
    await state.session.start(state.definition);
    expect(state.session.refreshRequired()).toBe(true); expect(state.session.canDiscard()).toBe(false);
    state.session.discard(); expect(state.session.proposal()).toBe(state.command);
    await state.session.retry();
    expect(state.submit).toHaveBeenCalledOnce(); expect(state.recover).toHaveBeenCalledWith('account-a', 'capture-a');
    expect(state.open).toHaveBeenCalledWith('account-a', 'capture-a');
  });
  it('blocks duplicate activation while saving and retains a failed proposal until explicit discard', async () => {
    const state = setup(); let finish!: (value: VisualizationCommandOutcome) => void;
    state.submit.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const first = state.session.start(state.definition), second = state.session.start(state.definition);
    expect(state.prepare).toHaveBeenCalledOnce(); expect(state.submit).toHaveBeenCalledOnce(); expect(state.session.canDiscard()).toBe(false);
    finish({ state: 'failed', command: state.command, error: new Error('Retry') }); await first; await second;
    expect(state.session.proposal()).toBe(state.command); state.session.discard();
    expect(state.session.needsProtection()).toBe(false);
    state.session.dispose(); expect(state.unregister).toHaveBeenCalledOnce();
  });
  it('clears mutation protection before navigation and retains a saved identity after a route failure', async () => {
    const state = setup(); state.open.mockImplementation(async () => { expect(state.session.needsProtection()).toBe(false); return false; });
    await state.session.start(state.definition);
    expect(state.session.saved()).toEqual({ accountGuid: 'account-a', guid: 'capture-a' });
    expect(state.session.message()).toContain('Saved successfully');
    await state.session.openSaved(); expect(state.submit).toHaveBeenCalledOnce(); expect(state.open).toHaveBeenCalledTimes(2);
  });
  it('does not publish old navigation after the owner changes or the session is destroyed', async () => {
    const state = setup(); let finish!: (value: VisualizationCommandOutcome) => void;
    state.submit.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const pending = state.session.start(state.definition); state.account.set('other');
    finish({ state: 'committed', command: state.command, value: undefined, referenceIssues: [] }); await pending;
    expect(state.open).not.toHaveBeenCalled(); expect(state.session.saved()?.guid).toBe('capture-a');
    state.session.dispose(); await state.session.openSaved(); expect(state.open).not.toHaveBeenCalled();
  });
});
