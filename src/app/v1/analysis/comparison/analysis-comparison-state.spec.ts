import { Component, TemplateRef, ViewChild, ViewContainerRef, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TemplatePortal } from '@angular/cdk/portal';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { AnalysisComparisonOption, AnalysisComparisonState } from './analysis-comparison-state';

const options: readonly AnalysisComparisonOption[] = [
  { key: 'account:a', label: 'Duplicate · Account analysis · Energy', scope: 'account', category: 'energy' },
  { key: 'account:b', label: 'Other · Account analysis · Energy', scope: 'account', category: 'energy' },
  { key: 'account:w', label: 'Water · Account analysis · Water', scope: 'account', category: 'water' },
  { key: 'facility:a', label: 'Duplicate · Facility analysis · Plant A', scope: 'facility', category: 'energy', facilityGuid: 'plant-a' },
  { key: 'facility:b', label: 'Other · Facility analysis · Plant A', scope: 'facility', category: 'energy', facilityGuid: 'plant-a' },
  { key: 'facility:c', label: 'Other · Facility analysis · Plant B', scope: 'facility', category: 'energy', facilityGuid: 'plant-b' }
];
@Component({ standalone: true, template: '<ng-template #panel>Comparison</ng-template>' })
class Host {
  @ViewChild('panel', { static: true }) panel!: TemplateRef<unknown>;
  readonly container = inject(ViewContainerRef);
  readonly options = signal(options);
  readonly context = signal<string | undefined>('account-a');
  readonly comparison = new AnalysisComparisonState(this.options, this.context);
}
function setup() {
  const fixture = TestBed.configureTestingModule({ imports: [Host] }).createComponent(Host); fixture.detectChanges();
  const host = fixture.componentInstance;
  const open = (key?: string) => { host.comparison.open(host.panel, host.container, key); fixture.detectChanges(); };
  return { fixture, host, state: host.comparison, open, portal: TestBed.inject(ModalPortalService) };
}
describe('Analysis comparison session', () => {
  it('starts empty or seeds the first slot and filters scope, category, duplicate identities and facility ownership', () => {
    const { state, open } = setup(); open(); expect(state.selection()).toEqual({ first: null, second: null });
    state.close(); open('facility:a'); expect(state.initialFocus()).toContain('second');
    expect(state.secondOptions().map(option => option.key)).toEqual(['facility:b']);
    state.select({ first: 'facility:a', second: 'facility:c' }); expect(state.selection().second).toBeNull();
    state.select({ first: 'account:a', second: 'account:w' }); expect(state.selection().second).toBeNull();
    state.select({ first: 'account:a', second: 'facility:a' }); expect(state.selection().second).toBeNull();
    state.select({ first: 'account:b', second: 'account:a' }); expect(state.selectedKeys()).toEqual(['account:b', 'account:a']); expect(state.complete()).toBe(true);
  });
  it('retains a compatible second selection and explains clearing an incompatible one', () => {
    const { host, state, open } = setup(); open('account:a');
    host.options.update(items => [...items, { ...items[0], key: 'account:c' }]);
    state.select({ first: 'account:a', second: 'account:b' });
    state.select({ first: 'account:c', second: 'account:b' }); expect(state.selection().second).toBe('account:b');
    state.select({ first: 'facility:a', second: 'account:b' }); expect(state.selection().second).toBeNull(); expect(state.notice()).toContain('cleared');
  });
  for (const removed of ['account:a', 'account:b']) {
    it(`clears only the removed slot for ${removed}`, () => {
      const { fixture, host, state, open } = setup(); open('account:a'); state.select({ first: 'account:a', second: 'account:b' });
      host.options.update(items => items.filter(item => item.key !== removed)); fixture.detectChanges();
      expect(state.selection()).toEqual({ first: removed === 'account:a' ? null : 'account:a', second: removed === 'account:b' ? null : 'account:b' });
      expect(state.notice()).toContain('no longer available'); expect(state.complete()).toBe(false);
    });
  }
  it('releases selections on close and context changes, and never hides a replacement portal', () => {
    const { fixture, host, state, open, portal } = setup(); open('account:a'); state.select({ first: 'account:a', second: 'account:b' });
    state.close(); expect(portal.activePortal()).toBeNull(); expect(state.selectedKeys()).toEqual([]);
    open(); expect(state.selection()).toEqual({ first: null, second: null });
    const replacement = new TemplatePortal(host.panel, host.container); portal.show(replacement); fixture.detectChanges();
    expect(state.opened()).toBe(false); expect(portal.activePortal()).toBe(replacement);
    open('account:a'); host.context.set('account-b'); fixture.detectChanges(); expect(state.opened()).toBe(false);
    open(); fixture.destroy(); expect(portal.activePortal()).toBeNull();
  });
});
