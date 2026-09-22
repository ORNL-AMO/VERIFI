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
});
