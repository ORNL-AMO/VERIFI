import { SectionNavModule } from '@app/v1/shell/section-nav/section-nav.module';
import { Component, computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterOutlet, provideRouter } from '@angular/router';
import { page, userEvent } from 'vitest/browser';
import { IdbFacility } from '@data/models/idbModels/facility';
import { BrowsePositionDirective } from './browse-position.directive';
import { BrowseFilters, BrowseKey, rememberBrowseForm } from './browse-state.service';

@Component({ standalone: true, imports: [BrowsePositionDirective, ReactiveFormsModule],
  template: `<section [appBrowsePosition]="key()" [browseVisibleIds]="ids"><h1 tabindex="-1">Facilities</h1><input aria-label="Search" [formControl]="form.controls.search">@for (id of ids; track id) { <button [attr.data-browse-id]="id" style="display:block;height:45px">{{ id }}</button> }</section>` })
class BrowsePage {
  readonly account = signal('a');
  readonly ids = Array.from({ length: 64 }, (_, index) => `facility-${index}`);
  readonly key = computed<BrowseKey<'facilities'>>(() => ({ kind: 'facilities', accountGuid: this.account() }));
  readonly form = new FormGroup({ search: new FormControl('', { nonNullable: true }), status: new FormControl<BrowseFilters['facilities']['status']>('all', { nonNullable: true }), sort: new FormControl<BrowseFilters['facilities']['sort']>('facilityName', { nonNullable: true }) });
  readonly filters = rememberBrowseForm(this.key, this.form);
}
@Component({ standalone: true, imports: [SectionNavModule], template: `<div class="v1-root v1-theme-dark" style="height:180px;min-height:0;width:220px;overflow:auto"><app-facility-picker [facilities]="facilities" (facilitySelected)="selected.set($event)"/></div>` })
class PickerHost {
  readonly facilities = Array.from({ length: 64 }, (_, index) => ({ guid: `f-${index}`, name: `Plant ${index}`, city: index === 63 ? 'Memphis' : 'Knoxville', state: 'TN' } as IdbFacility));
  readonly selected = signal<string | undefined>(undefined);
}

@Component({ standalone: true, imports: [RouterOutlet], template: '<main style="height:400px;overflow:auto"><router-outlet/></main>' })
class RoutedBrowseHost { }
@Component({ standalone: true, template: '<h1>Meter settings</h1>' })
class MeterPage { }

describe('drill-down browser behavior', () => {
  it('restores position and item focus after real router deactivation and return', async () => {
    TestBed.configureTestingModule({ imports: [RoutedBrowseHost], providers: [provideRouter([
      { path: 'facilities', component: BrowsePage }, { path: 'meter', component: MeterPage }
    ])] });
    const fixture = TestBed.createComponent(RoutedBrowseHost); fixture.detectChanges();
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/facilities'); fixture.detectChanges(); await fixture.whenStable();
    const root = fixture.nativeElement.querySelector('main') as HTMLElement;
    const target = root.querySelector<HTMLButtonElement>('[data-browse-id="facility-22"]')!;
    target.focus(); root.scrollTop = 950;
    await router.navigateByUrl('/meter'); fixture.detectChanges();
    await router.navigateByUrl('/facilities'); fixture.detectChanges();
    await vi.waitFor(() => {
      expect(root.scrollTop).toBe(950);
      expect((document.activeElement as HTMLElement).dataset['browseId']).toBe('facility-22');
    });
    fixture.destroy();
  });
  it('restores a destroyed browse page with its search, scroll and item focus, isolated by account', async () => {
    TestBed.configureTestingModule({ imports: [BrowsePage], providers: [provideRouter([])] });
    const root = document.createElement('main'); Object.assign(root.style, { height: '400px', overflow: 'auto' }); document.body.append(root);
    const first = TestBed.createComponent(BrowsePage); root.append(first.nativeElement); first.detectChanges();
    first.componentInstance.form.controls.search.setValue('Saved search'); first.detectChanges();
    const target = first.nativeElement.querySelector('[data-browse-id="facility-22"]') as HTMLButtonElement;
    target.focus(); root.scrollTop = 950;
    first.destroy(); first.nativeElement.remove();
    const second = TestBed.createComponent(BrowsePage); root.append(second.nativeElement); second.detectChanges();
    await vi.waitFor(() => {
      expect(second.componentInstance.filters().search).toBe('Saved search');
      expect(root.scrollTop).toBe(950);
      expect((document.activeElement as HTMLElement)?.dataset['browseId']).toBe('facility-22');
    });
    const returned = second.nativeElement.querySelector('[data-browse-id="facility-22"]') as HTMLButtonElement;
    expect(returned.getAnimations()).toHaveLength(1);
    const highlight = returned.getAnimations()[0]; highlight.pause(); highlight.currentTime = 100;
    expect(getComputedStyle(returned).outlineStyle).toBe('solid');
    expect(getComputedStyle(returned).outlineWidth).toBe('2px');
    second.componentInstance.account.set('b'); second.detectChanges();
    await vi.waitFor(() => { expect(root.scrollTop).toBe(0); expect(second.componentInstance.filters().search).toBe(''); });
    expect(returned.getAnimations()).toHaveLength(0);
    second.destroy(); root.remove();
  });
  it('opens a themed searchable picker beyond a short sidebar and supports keyboard selection and Escape', async () => {
    await page.viewport(1200, 800);
    TestBed.configureTestingModule({ imports: [PickerHost] });
    const fixture = TestBed.createComponent(PickerHost); fixture.detectChanges();
    await page.getByRole('button', { name: /Choose facility/ }).click(); fixture.detectChanges();
    const search = page.getByRole('searchbox', { name: 'Search facilities' }); await search.fill('Memphis'); fixture.detectChanges();
    await userEvent.keyboard('{ArrowDown}{Enter}'); fixture.detectChanges();
    expect(fixture.componentInstance.selected()).toBe('f-63');
    expect(document.querySelector('.v1-facility-picker__menu')).toBeNull();
    await page.getByRole('button', { name: /Choose facility/ }).click(); fixture.detectChanges();
    const menu = document.querySelector<HTMLElement>('.v1-facility-picker__menu')!;
    expect(menu.closest('.v1-theme-dark')).not.toBeNull();
    const list = menu.querySelector<HTMLElement>('.v1-facility-picker__list')!;
    expect(list.getBoundingClientRect().height).toBeGreaterThan(30 * parseFloat(getComputedStyle(document.documentElement).fontSize));
    expect(list.scrollHeight).toBeGreaterThan(list.clientHeight);
    expect(menu.getBoundingClientRect().bottom).toBeGreaterThan(fixture.nativeElement.querySelector('.v1-root').getBoundingClientRect().bottom);
    const button = menu.querySelector<HTMLElement>('button')!; const rect = button.getBoundingClientRect();
    expect(button.contains(document.elementFromPoint(rect.left + 30, rect.top + 10))).toBe(true);
    await userEvent.keyboard('{Escape}'); fixture.detectChanges();
    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('.v1-facility-picker__toggle'));
    await page.viewport(800, 400);
    await page.getByRole('button', { name: /Choose facility/ }).click(); fixture.detectChanges();
    const compactMenu = document.querySelector<HTMLElement>('.v1-facility-picker__menu')!;
    await vi.waitFor(() => {
      expect(compactMenu.getBoundingClientRect().top).toBeGreaterThanOrEqual(0);
      expect(compactMenu.getBoundingClientRect().bottom).toBeLessThanOrEqual(400);
      expect(compactMenu.querySelector<HTMLElement>('.v1-facility-picker__list')!.clientHeight).toBeGreaterThan(100);
    });
    fixture.destroy();
  });
});
