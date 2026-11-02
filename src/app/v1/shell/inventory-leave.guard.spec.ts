import { Component, DestroyRef, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, RouterOutlet, RouterStateSnapshot, provideRouter } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { inventoryLeaveGuard } from './inventory-leave.guard';

describe('inventoryLeaveGuard', () => {
  const current = '/v1/workspace/account/account-a/data/portfolio/meters';
  const destination = '/v1/workspace/account/account-a/data/portfolio/predictors';
  let pending: ReturnType<typeof signal<boolean>>;
  let changes: UnsavedChangesService;

  beforeEach(() => {
    pending = signal(false);
    TestBed.configureTestingModule({ providers: [{ provide: AccountWorkspaceStore, useValue: { hasPending: pending } }] });
    changes = TestBed.inject(UnsavedChangesService);
  });

  function leave(next = destination) {
    return TestBed.runInInjectionContext(() => inventoryLeaveGuard(null, null!,
      { url: current } as RouterStateSnapshot, { url: next } as RouterStateSnapshot));
  }

  it('protects sibling exits using parent or child registrations even without a routed component', async () => {
    const unregister = changes.register(() => false, () => {}, () => true);
    expect(await leave()).toBe(false);
    unregister();
    expect(await leave()).toBe(true);
  });

  it('leaves same-path query/fragment changes to the existing scope guard while UI is blocked', async () => {
    changes.register(() => false, () => {}, () => true);
    pending.set(true);
    expect(await leave(`${current}?facility=facility-b#inventory`)).toBe(true);
  });

  it('blocks pending commands and failed flushes without discarding the editor', async () => {
    const discard = vi.fn(), flush = vi.fn(async () => false);
    changes.register(() => true, discard, () => false, flush);
    pending.set(true);
    expect(await leave()).toBe(false);
    expect(flush).not.toHaveBeenCalled();
    pending.set(false);
    expect(await leave()).toBe(false);
    expect(flush).toHaveBeenCalledOnce();
    expect(discard).not.toHaveBeenCalled();
  });

  it('rechecks commands after flushing and respects cancellation of a remaining dirty draft', async () => {
    let finish!: (value: boolean) => void;
    changes.register(() => true, () => {}, () => false, () => new Promise(resolve => { finish = resolve; }));
    const leaving = leave();
    pending.set(true); finish(true);
    expect(await leaving).toBe(false);
    pending.set(false);
    const confirm = vi.spyOn(changes, 'confirmDiscard').mockReturnValue(false);
    const cancelled = leave(); finish(true);
    expect(await cancelled).toBe(false);
    expect(confirm).toHaveBeenCalledOnce();
  });
});

@Component({ standalone: true, imports: [RouterOutlet], template: '<router-outlet/>' })
class EmptyInventoryHost {}
@Component({ standalone: true, imports: [RouterOutlet], template: '@if (hasFacilities()) { <router-outlet/> }' })
class EmptyInventoryParent {
  readonly hasFacilities = signal(false);
  readonly drawerOpen = signal(true);
  constructor() {
    const unregister = inject(UnsavedChangesService).register(() => false, () => {}, () => this.drawerOpen());
    inject(DestroyRef).onDestroy(unregister);
  }
}
@Component({ standalone: true, template: 'Inventory destination' })
class EmptyInventoryDestination {}

describe('inventory exits without an active child outlet', () => {
  it('retains an empty Data parent with its first-facility drawer until the drawer closes', async () => {
    TestBed.configureTestingModule({ imports: [EmptyInventoryHost], providers: [
      { provide: AccountWorkspaceStore, useValue: { hasPending: () => false } },
      provideRouter([
        { path: 'inventory', component: EmptyInventoryParent, children: [
          { path: 'facilities', component: EmptyInventoryDestination, canDeactivate: [inventoryLeaveGuard] }
        ] },
        { path: 'elsewhere', component: EmptyInventoryDestination }
      ])
    ] });
    const fixture = TestBed.createComponent(EmptyInventoryHost);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/inventory/facilities'); fixture.detectChanges();
    const parent = fixture.debugElement.query(By.directive(EmptyInventoryParent)).componentInstance as EmptyInventoryParent;
    expect(fixture.nativeElement.textContent).not.toContain('Inventory destination');
    expect(await router.navigateByUrl('/elsewhere')).toBe(false);
    expect(router.url).toBe('/inventory/facilities');
    parent.drawerOpen.set(false);
    expect(await router.navigateByUrl('/elsewhere')).toBe(true);
    fixture.destroy();
  });
});
