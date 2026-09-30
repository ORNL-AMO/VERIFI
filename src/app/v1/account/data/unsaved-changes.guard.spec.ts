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

  it('allows navigation when a route has no active component instance', () => {
    const result = TestBed.runInInjectionContext(() =>
      unsavedChangesGuard(null, null as any, null as any, null as any)
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

  it('allows a component-owned workflow transition without discarding dirty state', () => {
    const unsaved = TestBed.inject(UnsavedChangesService);
    vi.spyOn(unsaved, 'confirmDiscard');
    const nextState = { url: '/v1/workspace/account/account-1/imports/file/draft-1/facilities' } as any;

    const result = TestBed.runInInjectionContext(() =>
      unsavedChangesGuard({
        hasUnsavedChanges: () => true,
        canNavigateWithoutDiscard: state => state === nextState
      }, null as any, null as any, nextState)
    );

    expect(result).toBe(true);
    expect(unsaved.confirmDiscard).not.toHaveBeenCalled();
  });

  it('blocks navigation without prompting while a save is in progress', () => {
    const unsaved = TestBed.inject(UnsavedChangesService);
    vi.spyOn(unsaved, 'confirmDiscard');

    const result = TestBed.runInInjectionContext(() =>
      unsavedChangesGuard({
        hasUnsavedChanges: () => true,
        isNavigationBlocked: () => true,
        canNavigateWithoutDiscard: () => true
      }, null as any, null as any, { url: '/allowed' } as any)
    );

    expect(result).toBe(false);
    expect(unsaved.confirmDiscard).not.toHaveBeenCalled();
  });
});
