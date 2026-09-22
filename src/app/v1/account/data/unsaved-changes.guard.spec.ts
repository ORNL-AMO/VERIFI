import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { unsavedChangesGuard } from './unsaved-changes.guard';

describe('unsavedChangesGuard', () => {
  beforeEach(() => TestBed.configureTestingModule({}));
  afterEach(() => vi.restoreAllMocks());

  it('allows navigation when the component is clean', () => {
    const result = TestBed.runInInjectionContext(() =>
      unsavedChangesGuard({ hasUnsavedChanges: () => false }, null as any, null as any, null as any)
    );
    expect(result).toBe(true);
  });

  it('uses user confirmation when changes are dirty', () => {
    const unsaved = TestBed.inject(UnsavedChangesService);
    vi.spyOn(unsaved, 'confirmDiscard').mockReturnValue(false);

    const result = TestBed.runInInjectionContext(() =>
      unsavedChangesGuard({ hasUnsavedChanges: () => true }, null as any, null as any, null as any)
    );
    expect(result).toBe(false);
    expect(unsaved.confirmDiscard).toHaveBeenCalledWith(true);
  });

  it('blocks navigation without prompting while a save is in progress', () => {
    const unsaved = TestBed.inject(UnsavedChangesService);
    vi.spyOn(unsaved, 'confirmDiscard');

    const result = TestBed.runInInjectionContext(() =>
      unsavedChangesGuard({
        hasUnsavedChanges: () => true,
        isNavigationBlocked: () => true
      }, null as any, null as any, null as any)
    );

    expect(result).toBe(false);
    expect(unsaved.confirmDiscard).not.toHaveBeenCalled();
  });
});
