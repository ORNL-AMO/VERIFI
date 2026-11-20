import { TestBed } from '@angular/core/testing';
import { HomeWidgetCardComponent } from './widget-card.component';
import { HomeWidgetView } from '../home-widget-view';
import { setupHome } from '../testing/home-testing';

function card(view: HomeWidgetView, enabled = true) {
  setupHome(); const fixture = TestBed.createComponent(HomeWidgetCardComponent);
  fixture.componentRef.setInput('view', view); fixture.componentRef.setInput('editing', true); fixture.componentRef.setInput('enabled', enabled); fixture.detectChanges();
  return fixture;
}
describe('Home widget settings', () => {
  it('emits typed note and size edits without normalizing other widget settings, and renders text literally', () => {
    const widget = { kind: 'note' as const, id: 'id with spaces', size: 'half' as const, visibility: 'water' as const, text: '<b>Literal</b>' };
    const fixture = card({ widget, title: 'Note', state: 'ready', message: '' });
    const changes: unknown[] = []; fixture.componentInstance.changed.subscribe(change => changes.push(change));
    expect(fixture.nativeElement.querySelector('.home-note').textContent).toBe('<b>Literal</b>'); expect(fixture.nativeElement.querySelector('b')).toBeNull();
    fixture.componentInstance.size.setValue('full');
    expect(changes[0]).toEqual({ widget: { ...widget, size: 'full' } });
    expect(fixture.nativeElement.querySelector('article').getAttribute('aria-labelledby')).not.toContain('id with spaces');
  });
  it('acknowledges only reviewed blocked shortcut paths after an explicit destination choice', () => {
    const destination = { area: 'settings' as const, owner: { kind: 'account' as const, guid: 'account-a' } };
    const widget = { kind: 'shortcut' as const, id: 's', size: 'full' as const, visibility: 'always' as const, destination };
    const path = 'widgets.s.destination.owner.guid';
    const fixture = card({ widget, title: 'Shortcut', state: 'repair-required', blockedPaths: [path], message: 'Blocked' });
    const choice = { key: 'verified', label: 'Account settings', destination, route: ['/v1'], queryParams: {} };
    fixture.componentRef.setInput('shortcuts', [choice]); fixture.detectChanges();
    const changes: unknown[] = []; fixture.componentInstance.changed.subscribe(change => changes.push(change));
    fixture.componentInstance.title.setValue('Renamed'); expect(changes[0]).not.toHaveProperty('repairPaths');
    fixture.componentInstance.destination.setValue('verified'); expect(changes[1]).toEqual({ widget, repairPaths: [path] });
  });
  it('does not emit settings changes while saving or retaining a rejected proposal', () => {
    const widget = { kind: 'note' as const, id: 'n', size: 'full' as const, visibility: 'always' as const, text: 'Saved' };
    const fixture = card({ widget, title: 'Note', state: 'ready', message: '' }, false);
    const changed = vi.fn(); fixture.componentInstance.changed.subscribe(changed);
    fixture.componentInstance.text.setValue('Cannot replace pending draft'); expect(changed).not.toHaveBeenCalled();
  });
});
