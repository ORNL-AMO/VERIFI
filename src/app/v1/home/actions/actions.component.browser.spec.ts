import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HomeModule } from '../home.module';
import { HomeContext } from '../home-context.service';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { HomeActionsComponent } from './actions.component';
import { StatusItem } from '@app/v1/status/status.models';
import { vi } from 'vitest';
import { page, userEvent, cdp } from 'vitest/browser';
import { textContrast } from '@app/v1/shared/inventory/inventory-browser-test.helpers';

describe('Home actions', () => {
  it('supports keyboard paging, themes, long names, narrow layout and complete printing', async () => {
    const owner = signal({kind: 'facility', guid: 'f'}), state = signal('evaluating');
    const navigateTo = vi.fn();
    const items = Array.from({length: 27}, (_, index) => ({id: String(index), severity: index === 26 ? 'error' : 'warning', title: `Action ${index} ${'Long facility label '.repeat(7)}`,
      entity: {accountGuid: 'a', facilityGuid: index === 25 ? 'other' : 'f', name: 'Meter'}, destination: {kind: 'unavailable'}, todo: true} as StatusItem));
    TestBed.configureTestingModule({imports: [HomeModule], providers: [{provide: WorkspaceNavigationService, useValue: {openTodos: vi.fn()}},
      {provide: HomeContext, useValue: {owner, ownerName: signal('Facility'), workspace: {account: () => ({guid: 'a'})}}},
      {provide: WorkspaceStatusService, useValue: {state, evaluation: () => ({accountGuid: 'a'}), accountTodos: () => items, navigateTo}}
    ]});
    const fixture = TestBed.createComponent(HomeActionsComponent); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Evaluating'); expect(fixture.nativeElement.textContent).not.toContain('No actions');
    state.set('ready'); fixture.detectChanges();
    expect(fixture.componentInstance.items()).toHaveLength(26);
    expect(fixture.componentInstance.items()[0].id).toBe('26');
    expect(fixture.componentInstance.visible()).toHaveLength(24);
    const root = fixture.nativeElement as HTMLElement; root.className = 'v1-root';
    const next = root.querySelector<HTMLButtonElement>('button[aria-label="Next page"]')!; next.focus();
    await userEvent.keyboard('{Enter}'); fixture.detectChanges(); expect(fixture.componentInstance.visible()).toHaveLength(2);
    expect(document.activeElement).toBe(next);
    for (const dark of [false, true]) { root.classList.toggle('v1-theme-dark', dark); expect(textContrast(root.querySelector('strong')!)).toBeGreaterThanOrEqual(4.5); }
    await page.viewport(390, 850); expect(root.scrollWidth).toBeLessThanOrEqual(390);
    await (cdp() as any).send('Emulation.setEmulatedMedia', {media: 'print'});
    await vi.waitFor(() => { fixture.detectChanges(); expect(root.querySelectorAll('li > strong')).toHaveLength(26); });
    await (cdp() as any).send('Emulation.setEmulatedMedia', {media: ''}); await page.viewport(1200, 900);
    owner.set({kind: 'facility', guid: 'empty'}); fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('No actions');
    state.set('error'); fixture.detectChanges(); expect(fixture.nativeElement.textContent).not.toContain('No actions'); fixture.destroy();
  });
});
