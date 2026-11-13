import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { UnsavedChangesService } from './unsaved-changes.service';

describe('UnsavedChangesService', () => {
  let service: UnsavedChangesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UnsavedChangesService);
  });

  afterEach(() => { TestBed.resetTestingModule(); vi.restoreAllMocks(); });

  it('serializes shared async preflight and preserves cancellation without native confirmation', async () => {
    let finish!: (accepted: boolean) => void;
    const resolver = vi.fn(() => new Promise<boolean>(resolve => finish = resolve));
    const release = service.registerNavigationPreflight(resolver);
    const confirm = vi.spyOn(window, 'confirm');
    const first = service.resolveNavigationPreflight();
    const second = service.resolveNavigationPreflight();
    expect(first).toBe(second);
    finish(false);
    await expect(first).resolves.toBe(false);
    expect(resolver).toHaveBeenCalledOnce();
    expect(confirm).not.toHaveBeenCalled();
    release();
    await expect(service.resolveNavigationPreflight()).resolves.toBe(true);
  });

  it('discards registered dirty editors after confirmation', () => {
    const discard = vi.fn();
    service.register(() => true, discard);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    expect(service.confirmDiscard()).toBe(true);
    expect(discard).toHaveBeenCalled();
  });

  it('keeps registered editors intact when confirmation is declined', () => {
    const discard = vi.fn();
    service.register(() => true, discard);
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    expect(service.confirmDiscard()).toBe(false);
    expect(discard).not.toHaveBeenCalled();
  });

  it('blocks navigation without prompting while a registered save is in progress', () => {
    const confirm = vi.spyOn(window, 'confirm');
    service.register(() => true, vi.fn(), () => true);

    expect(service.confirmDiscard()).toBe(false);
    expect(confirm).not.toHaveBeenCalled();
  });

  it('flushes a registered dirty editor before navigation', async () => {
    const flush = vi.fn().mockResolvedValue(true);
    service.register(() => true, vi.fn(), () => false, flush);

    await expect(service.flushPendingChanges()).resolves.toBe(true);
    expect(flush).toHaveBeenCalledOnce();
  });

  it('flushes a registered editor while navigation is blocked by an active save', async () => {
    const flush = vi.fn().mockResolvedValue(false);
    service.register(() => false, vi.fn(), () => true, flush);

    await expect(service.flushPendingChanges()).resolves.toBe(false);
    expect(flush).toHaveBeenCalledOnce();
  });

  it('stops navigation when a registered editor cannot flush', async () => {
    const firstFlush = vi.fn().mockResolvedValue(false);
    const secondFlush = vi.fn().mockResolvedValue(true);
    service.register(() => true, vi.fn(), () => false, firstFlush);
    service.register(() => true, vi.fn(), () => false, secondFlush);

    await expect(service.flushPendingChanges()).resolves.toBe(false);
    expect(firstFlush).toHaveBeenCalledOnce();
    expect(secondFlush).not.toHaveBeenCalled();
  });

  it('ignores dirty editors that do not support flushing', async () => {
    service.register(() => true, vi.fn());

    await expect(service.flushPendingChanges()).resolves.toBe(true);
  });

  it('shares one browser listener and removes it when the final draft no longer needs protection', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    const first = signal(false), second = signal(false);
    const releaseFirst = service.protectBeforeUnload(first);
    const releaseSecond = service.protectBeforeUnload(second);
    const added = () => add.mock.calls.filter(([name]) => name === 'beforeunload');
    const removed = () => remove.mock.calls.filter(([name]) => name === 'beforeunload');
    TestBed.tick(); expect(added()).toHaveLength(0);

    first.set(true); TestBed.tick(); expect(added()).toHaveLength(1);
    second.set(true); TestBed.tick(); expect(added()).toHaveLength(1);
    first.set(false); TestBed.tick(); expect(removed()).toHaveLength(0);
    const protectedEvent = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(protectedEvent);
    expect(protectedEvent.defaultPrevented).toBe(true);

    second.set(false); TestBed.tick(); expect(removed()).toHaveLength(1);
    const pristineEvent = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(pristineEvent);
    expect(pristineEvent.defaultPrevented).toBe(false);
    releaseFirst(); releaseSecond(); TestBed.tick(); expect(removed()).toHaveLength(1);
  });

  it('releases browser protection on unregister and application destruction without invoking saves', () => {
    const pending = signal(true), flush = vi.fn();
    service.register(() => false, vi.fn(), pending, flush);
    const release = service.protectBeforeUnload(pending); TestBed.tick();
    const event = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true); expect(flush).not.toHaveBeenCalled();
    release(); TestBed.tick();
    const released = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(released);
    expect(released.defaultPrevented).toBe(false);
    service.protectBeforeUnload(pending); TestBed.tick(); TestBed.resetTestingModule();
    const destroyed = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(destroyed);
    expect(destroyed.defaultPrevented).toBe(false);
  });
});
