import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { UnsavedChangesService } from './unsaved-changes.service';

describe('UnsavedChangesService', () => {
  let service: UnsavedChangesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UnsavedChangesService);
  });

  afterEach(() => vi.restoreAllMocks());

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
});
