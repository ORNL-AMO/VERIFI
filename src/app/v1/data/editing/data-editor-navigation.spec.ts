import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CanActivateFn, Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { vi } from 'vitest';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { unsavedChangesGuard } from '@app/v1/shared/navigation/unsaved-changes.guard';
import { registerDataDraft } from './register-data-draft';

@Component({ standalone: true, template: '<p>Editable record</p>' })
class RoutedEditor {
  readonly dirty = signal(false);
  readonly saving = signal(false);
  readonly draft = signal('Original');
  constructor() {
    registerDataDraft(this.dirty, () => { this.dirty.set(false); this.draft.set('Original'); }, this.saving);
  }
  hasUnsavedChanges(): boolean { return this.dirty(); }
  isNavigationBlocked(): boolean { return this.saving(); }
}

describe('Data editor routed draft protection', () => {
  afterEach(() => { vi.restoreAllMocks(); TestBed.resetTestingModule(); });

  it('guards reused owner/resource parameters before an activation can change workspace context', async () => {
    const events: string[] = [];
    const activate: CanActivateFn = route => { events.push(route.paramMap.get('meterGuid')!); return true; };
    TestBed.configureTestingModule({ providers: [provideRouter([
      { path: 'account/:accountGuid/facility/:facilityGuid/meters/:meterGuid', canActivate: [activate], children: [
        { path: 'settings', component: RoutedEditor, canDeactivate: [unsavedChangesGuard], runGuardsAndResolvers: 'paramsChange' }
      ] }
    ])] });
    const harness = await RouterTestingHarness.create();
    const original = '/account/a/facility/f/meters/one/settings';
    const editor = await harness.navigateByUrl(original, RoutedEditor);
    editor.dirty.set(true); editor.draft.set('Keep my draft');
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await harness.navigateByUrl('/account/b/facility/g/meters/two/settings');
    expect(TestBed.inject(Router).url).toBe(original);
    expect(events).toEqual(['one']); expect(editor.draft()).toBe('Keep my draft');
    confirm.mockReturnValue(true);
    const reused = await harness.navigateByUrl('/account/b/facility/g/meters/two/settings', RoutedEditor);
    expect(reused).toBe(editor); expect(reused.dirty()).toBe(false);
    expect(events).toEqual(['one', 'two']); expect(confirm).toHaveBeenCalledTimes(2);
  });

  it('blocks resource navigation during persistence but retains drafts for query and fragment changes', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([
      { path: 'meters/:meterGuid/settings', component: RoutedEditor, canDeactivate: [unsavedChangesGuard], runGuardsAndResolvers: 'paramsChange' }
    ])] });
    const harness = await RouterTestingHarness.create();
    const editor = await harness.navigateByUrl('/meters/one/settings', RoutedEditor);
    editor.dirty.set(true); editor.draft.set('Unsaved');
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    await harness.navigateByUrl('/meters/one/settings?display=detail#notes');
    expect(editor.draft()).toBe('Unsaved'); expect(confirm).not.toHaveBeenCalled();
    editor.saving.set(true);
    await harness.navigateByUrl('/meters/two/settings');
    expect(TestBed.inject(Router).url).toBe('/meters/one/settings?display=detail#notes');
    expect(confirm).not.toHaveBeenCalled();
    await expect(TestBed.inject(UnsavedChangesService).flushPendingChanges()).resolves.toBe(true);
    expect(editor.draft()).toBe('Unsaved');
  });
});
