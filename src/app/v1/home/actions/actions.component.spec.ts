import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HomeModule } from '../home.module';
import { HomeContext } from '../home-context.service';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { HomeActionsComponent } from './actions.component';
import { StatusItem } from '@app/v1/status/status.models';
import { vi } from 'vitest';

describe('Home actions', () => {
  it('retains every owner action, severity/source order, current readiness and canonical destinations', () => {
    const owner = signal({kind: 'facility', guid: 'f'}), state = signal('evaluating');
    const navigateTo = vi.fn();
    const items = Array.from({length: 27}, (_, index) => ({id: String(index), severity: index === 26 ? 'error' : 'warning', title: `Action ${index}`,
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
    fixture.componentInstance.requestedPage.set(2); fixture.detectChanges(); expect(fixture.componentInstance.visible()).toHaveLength(2);
    owner.set({kind: 'facility', guid: 'empty'}); fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('No actions');
    state.set('error'); fixture.detectChanges(); expect(fixture.nativeElement.textContent).not.toContain('No actions'); fixture.destroy();
  });
});
