import { PortalModule } from '@angular/cdk/portal';
import { Location } from '@angular/common';
import { provideLocationMocks } from '@angular/common/testing';
import { Component, inject, computed, signal } from '@angular/core';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, NavigationCancel, NavigationEnd, Router, RouterLink, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Subject, filter, firstValueFrom } from 'rxjs';
import { page, userEvent } from 'vitest/browser';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { unsavedChangesGuard } from '@app/v1/shared/navigation/unsaved-changes.guard';
import { EditorConflictReviewComponent } from './editor-conflict-review/editor-conflict-review.component';
import { ConflictChoices, DraftConflict, reconcileFields } from './draft-reconciliation';
import { EditSaveMode, injectSettingsEditSession } from './settings-edit-session';

@Component({ standalone: true, imports: [EditorConflictReviewComponent, PortalModule],
  template: '<app-editor-conflict-review [conflicts]="conflicts" (resolved)="resolved($event)"/><ng-template [cdkPortalOutlet]="modal.activePortal()"/>' })
class BrowserConflictHost {
  readonly modal = inject(ModalPortalService);
  readonly conflicts: readonly DraftConflict[] = [{ id: 'name', label: 'Meter name', localValue: 'My meter', savedValue: 'Saved meter' }];
  readonly resolved = vi.fn<(choices: ConflictChoices) => void>();
}

@Component({ standalone: true, imports: [ReactiveFormsModule, RouterLink],
  template: '<label>Meter name<input aria-label="Meter name" [formControl]="name"/></label><a routerLink="/meters/two/settings">Open another meter</a>' })
class BrowserRoutedEditor {
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });
  private readonly key = computed(() => this.params().get('meterGuid') ?? '');
  private readonly values = signal<Record<string, { name: string }>>({ one: { name: 'Meter one' }, two: { name: 'Meter two' } });
  readonly name = new FormControl('', { nonNullable: true });
  private readonly changes = new Subject<EditSaveMode>();
  readonly persist = vi.fn(async (value: { name: string }) => {
    this.values.update(records => ({ ...records, [this.key()]: value })); return value;
  });
  readonly editor = injectSettingsEditSession({ key: this.key, saved: computed(() => this.values()[this.key()]),
    canWrite: signal(true), pendingOwners: signal([]), changes: this.changes,
    read: () => ({ name: this.name.value }), hydrate: value => this.name.setValue(value?.name ?? '', { emitEvent: false }),
    normalize: value => ({ name: value.name.trim() }), valid: value => !!value.name.trim(),
    reconcile: (b, l, s, choices) => reconcileFields(b, l, s, { choices }), persist: this.persist,
    setEnabled: enabled => enabled ? this.name.enable({ emitEvent: false }) : this.name.disable({ emitEvent: false }) });
  constructor() { this.name.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.changes.next('debounced')); }
  hasUnsavedChanges(): boolean { return this.editor.dirty(); }
  isNavigationBlocked(): boolean { return this.editor.saving(); }
}

describe('Data editing interactions in Chromium', () => {
  afterEach(() => vi.restoreAllMocks());

  it('keeps an unanswered conflict cancellable and contains keyboard focus in its shell portal', async () => {
    await page.viewport(390, 800);
    TestBed.configureTestingModule({ imports: [BrowserConflictHost], providers: [ModalPortalService] });
    const fixture = TestBed.createComponent(BrowserConflictHost);
    const root = document.createElement('main'); root.className = 'v1-root'; root.style.width = '360px';
    document.body.append(root); root.append(fixture.nativeElement); fixture.detectChanges();
    try {
      await page.getByRole('button', { name: 'Review conflicting changes' }).click(); fixture.detectChanges();
      await fixture.whenStable();
      expect(root.querySelector('[role="dialog"]')).not.toBeNull();
      const confirm = root.querySelector<HTMLButtonElement>('footer button:last-child')!;
      expect(confirm.disabled).toBe(true);
      const select = root.querySelector<HTMLSelectElement>('select')!; select.focus();
      await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
      expect(document.activeElement?.closest('[role="dialog"]')).not.toBeNull();
      await userEvent.keyboard('{Escape}'); fixture.detectChanges();
      expect(root.querySelector('[role="dialog"]')).toBeNull();
      await page.getByRole('button', { name: 'Review conflicting changes' }).click(); fixture.detectChanges();
      await page.getByRole('combobox', { name: 'Keep', exact: true }).selectOptions('local'); fixture.detectChanges();
      await page.getByRole('button', { name: 'Apply choices' }).click(); fixture.detectChanges();
      expect(fixture.componentInstance.resolved).toHaveBeenCalledExactlyOnceWith({ name: 'local' });
      expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth + 1);
    } finally { fixture.destroy(); root.remove(); await page.viewport(1100, 850); }
  });

  it('protects a reused resource route and cancels its pending draft after confirmed discard', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([
      { path: 'meters/:meterGuid/settings', component: BrowserRoutedEditor,
        canDeactivate: [unsavedChangesGuard], runGuardsAndResolvers: 'paramsChange' }
    ]), provideLocationMocks()] });
    const harness = await RouterTestingHarness.create();
    const editor = await harness.navigateByUrl('/meters/one/settings', BrowserRoutedEditor);
    const root = document.createElement('main'); root.className = 'v1-root';
    document.body.append(root); root.append(harness.fixture.nativeElement);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    try {
      await page.getByRole('textbox', { name: 'Meter name' }).fill('Unsaved name');
      await page.getByRole('link', { name: 'Open another meter' }).click(); await harness.fixture.whenStable();
      expect(TestBed.inject(Router).url).toBe('/meters/one/settings'); expect(editor.name.value).toBe('Unsaved name');
      confirm.mockReturnValue(true);
      await page.getByRole('link', { name: 'Open another meter' }).click(); await harness.fixture.whenStable(); harness.fixture.detectChanges();
      expect(TestBed.inject(Router).url).toBe('/meters/two/settings');
      expect(harness.routeDebugElement!.componentInstance).toBe(editor);
      expect(editor.name.value).toBe('Meter two'); expect(editor.editor.dirty()).toBe(false);
      expect(editor.persist).not.toHaveBeenCalled();
      await page.getByRole('textbox', { name: 'Meter name' }).fill('Unsaved second meter');
      const router = TestBed.inject(Router), location = TestBed.inject(Location);
      // The harness navigates directly; application bootstrap normally installs this listener.
      router.initialNavigation();
      confirm.mockReturnValue(true);
      const acceptedBack = firstValueFrom(router.events.pipe(filter(event => event instanceof NavigationEnd)));
      location.back(); await acceptedBack; harness.fixture.detectChanges();
      expect(router.url).toBe('/meters/one/settings'); expect(editor.name.value).toBe('Meter one');
      const forward = firstValueFrom(router.events.pipe(filter(event => event instanceof NavigationEnd)));
      location.forward(); await forward; harness.fixture.detectChanges();
      await page.getByRole('textbox', { name: 'Meter name' }).fill('Keep this second draft');
      confirm.mockReturnValue(false);
      const cancelledBack = firstValueFrom(router.events.pipe(filter(event => event instanceof NavigationCancel)));
      location.back(); await cancelledBack;
      expect(router.url).toBe('/meters/two/settings'); expect(editor.name.value).toBe('Keep this second draft');
      expect(editor.persist).not.toHaveBeenCalled();
    } finally { harness.fixture.destroy(); root.remove(); }
  });
});
