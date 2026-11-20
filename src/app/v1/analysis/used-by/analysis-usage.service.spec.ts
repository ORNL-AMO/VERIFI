import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AnalysisUsageCommands } from '@data/account-workspace/analysis-usage-commands.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { WorkspaceWriteError } from '@data/account-workspace/workspace-commands.models';
import { analysisUsageFixture } from '@data/account-workspace/testing/analysis-usage-fixtures';
import { ANALYSIS_USAGE_HOST } from './analysis-usage-host';
import { AnalysisUsageService } from './analysis-usage.service';

function setup(scope: 'facility' | 'account' = 'facility') {
  const f = analysisUsageFixture();
  const store = new AccountWorkspaceStore(); store.publish(f.snapshot);
  const analysis = signal(scope === 'facility' ? f.analysis : f.accountAnalysis);
  const flush = vi.fn().mockResolvedValue(true);
  const navigate = vi.fn().mockResolvedValue(true);
  const commands = { saveReport: vi.fn().mockResolvedValue({}), saveAccountAnalysis: vi.fn().mockResolvedValue({}) };
  const recover = vi.fn().mockResolvedValue(undefined);
  TestBed.configureTestingModule({ providers: [AnalysisUsageService,
    { provide: ANALYSIS_USAGE_HOST, useValue: { scope, analysis, blocked: signal(false), flush } },
    { provide: AccountWorkspaceStore, useValue: store }, { provide: AnalysisUsageCommands, useValue: commands },
    { provide: Router, useValue: { navigate } },
    { provide: WorkspaceCommandBoundary, useValue: { recoverCommittedPublication: recover } }
  ] });
  const service = TestBed.inject(AnalysisUsageService);
  return { ...f, store, analysisSignal: analysis, service, flush, navigate, commands, recover };
}

describe('Analysis Used By action sessions', () => {
  it('steps through new report choices and opens the saved report without requiring results', async () => {
    const f = setup();
    await f.service.open('report');
    expect(f.service.step()).toBe('type');
    expect(f.service.reportTypes().some(item => item.type === 'savings' && item.pending)).toBe(true);
    expect(f.service.reportTypes().some(item => item.type === 'costSavings')).toBe(false);
    f.service.chooseType('facility:analysis');
    expect(f.service.step()).toBe('review');
    expect(f.service.canSave()).toBe(true);
    await f.service.submit();
    expect(f.commands.saveReport).toHaveBeenCalledWith(expect.objectContaining({ source: f.source,
      report: { scope: 'facility', facilityGuid: f.facility.guid, type: 'analysis' }, target: expect.objectContaining({ kind: 'new', name: 'Analysis report' }) }));
    expect(f.navigate).toHaveBeenCalledWith(expect.arrayContaining(['reports', 'setup']), expect.anything());
  });

  it('opens account creation directly and creates a fresh identity focused on this facility', async () => {
    const f = setup();
    await f.service.open('account-analysis');
    expect(f.service.step()).toBe('review');
    expect(f.service.form.controls.name.value).toBe('Account Analysis');
    await f.service.submit();
    const command = f.commands.saveAccountAnalysis.mock.calls[0][0];
    expect(command.target).toMatchObject({ kind: 'new', name: 'Account Analysis' });
    expect(command.target.guid).not.toBe(f.accountAnalysis.guid);
    expect(f.navigate).toHaveBeenCalledWith(['/v1', 'workspace', 'account', f.account.guid, 'analysis', 'workbench', command.target.guid, 'select-items'],
      { queryParams: { facilityGuid: f.facility.guid } });
  });

  it('refreshes changed source settings and retains a new-item draft after a failed save', async () => {
    const f = setup();
    await f.service.open('account-analysis');
    f.analysisSignal.update(item => ({ ...item, baselineYear: 2023 }));
    expect(f.service.canSave()).toBe(false);
    await f.service.submit(); expect(f.commands.saveAccountAnalysis).not.toHaveBeenCalled();
    f.service.refreshReview(); expect(f.service.accountBaseline()).toBe(2023);
    f.service.form.controls.name.setValue('Keep this name');
    f.commands.saveAccountAnalysis.mockRejectedValue(new Error('Save failed'));
    await f.service.submit();
    expect(f.service.error()).toBe('Save failed'); expect(f.service.editor()).toBe('account-analysis');
    expect(f.service.form.controls.name.value).toBe('Keep this name');
  });

  it('recovers committed publication without repeating persistence or creating another identity', async () => {
    const f = setup();
    await f.service.open('report'); f.service.chooseType('facility:modeling');
    f.commands.saveReport.mockRejectedValue(new WorkspaceWriteError('persistence-failed', 'Refresh failed', undefined, true));
    await f.service.submit(); expect(f.service.saved()?.recover).toBe(true);
    expect(f.service.dirty()).toBe(false);
    await f.service.submit(); expect(f.commands.saveReport).toHaveBeenCalledOnce();
    await f.service.openSaved();
    expect(f.recover).toHaveBeenCalledWith(f.account.guid);
    expect(f.commands.saveReport).toHaveBeenCalledOnce(); expect(f.navigate).toHaveBeenCalledOnce();
  });

  it('retains the saved destination if navigation fails and retries only opening', async () => {
    const f = setup();
    await f.service.open('account-analysis'); f.navigate.mockResolvedValueOnce(false);
    await f.service.submit(); expect(f.service.saved()).toBeDefined(); expect(f.service.canSave()).toBe(false);
    await f.service.openSaved(); expect(f.commands.saveAccountAnalysis).toHaveBeenCalledOnce(); expect(f.navigate).toHaveBeenCalledTimes(2);
  });

  it('prevents duplicate submissions while a save is pending', async () => {
    const f = setup();
    await f.service.open('account-analysis');
    let release!: () => void;
    f.commands.saveAccountAnalysis.mockImplementation(() => new Promise<void>(resolve => { release = resolve; }));
    const first = f.service.submit(); await Promise.resolve();
    await f.service.submit(); expect(f.commands.saveAccountAnalysis).toHaveBeenCalledOnce();
    release(); await first;
  });

  it('preserves single-facility presentation and exposes account-format report types', () => {
    const f = setup();
    f.store.publish({ ...f.snapshot, account: { ...f.account, isSingleFacilityCompany: true }, facilities: [f.facility] });
    expect(f.service.showAccountAction()).toBe(false);
    expect(f.service.reportTypes().some(item => item.value === 'account:betterPlants')).toBe(true);
  });

  it('blocks linking account site-energy analyses to incompatible reports', () => {
    const f = setup('account'); f.analysisSignal.update(item => ({ ...item, energyIsSource: false }));
    expect(f.service.reportTypes()).toEqual([]); expect(f.service.reportUnavailable()).toBeDefined();
  });

  it('explains why a facility without a baseline cannot create a new account analysis', async () => {
    const f = setup(); f.analysisSignal.update(item => ({ ...item, baselineYear: undefined }));
    await f.service.open('account-analysis');
    expect(f.service.canSave()).toBe(false); expect(f.service.creationRequirement()).toContain('Set a baseline year');
  });

  it('requests discard confirmation after choices and clears the session when its owner changes', async () => {
    const f = setup();
    await f.service.open('report'); f.service.chooseType('facility:analysis'); f.service.requestClose();
    expect(f.service.confirmDiscard()).toBe(true);
    TestBed.tick();
    f.analysisSignal.update(item => ({ ...item, guid: 'another-analysis' })); TestBed.tick();
    expect(f.service.editor()).toBeUndefined(); expect(f.service.confirmDiscard()).toBe(false);
  });

  it('never opens a stale action after awaiting a source save', async () => {
    const f = setup();
    let release!: (value: boolean) => void;
    f.flush.mockImplementation(() => new Promise<boolean>(resolve => { release = resolve; }));
    const open = f.service.open('report');
    f.analysisSignal.update(item => ({ ...item, guid: 'another-analysis' })); release(true); await open;
    expect(f.service.editor()).toBeUndefined();
  });

  it('protects stage navigation with the shared discard dialog and permits saved destination navigation', async () => {
    const f = setup();
    await f.service.open('report'); f.service.chooseType('facility:analysis');
    const cancelled = f.service.resolveLeave();
    expect(f.service.confirmDiscard()).toBe(true);
    f.service.cancelDiscard(); expect(await cancelled).toBe(false);
    const discarded = f.service.resolveLeave(); f.service.close();
    expect(await discarded).toBe(true); expect(f.service.editor()).toBeUndefined();
    await f.service.open('report'); f.service.chooseType('facility:analysis');
    f.navigate.mockImplementation(() => f.service.resolveLeave());
    await f.service.submit();
    expect(f.navigate).toHaveBeenCalledOnce(); expect(f.service.editor()).toBeUndefined();
  });
});
