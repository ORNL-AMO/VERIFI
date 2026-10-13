import { TestBed } from '@angular/core/testing';
import { ResourceNavGroupComponent } from './resource-nav-group.component';
import { setupSectionNavTest } from '../section-nav-test.helpers';
import type { ResourceNavGroup } from '../models';

describe('ResourceNavGroupComponent', () => {
  it('retains a valid controlled region when collapsed and exposes only available disclosure controls', () => {
    setupSectionNavTest();
    const fixture = TestBed.createComponent(ResourceNavGroupComponent);
    const group: ResourceNavGroup = {
      id: 'meters', label: 'Meters', icon: 'meter', route: ['/meters'], active: false,
      facilityGuid: 'facility-a', routeActive: true, childrenId: 'meter-links', childrenLabel: 'Meter links',
      children: [{ id: 'meter-a', label: 'Meter A', icon: 'meter', route: ['/meters', 'meter-a'], active: true }]
    };
    fixture.componentRef.setInput('group', group);
    fixture.detectChanges();
    const toggle: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(toggle.getAttribute('aria-controls')).toBe('meter-links');
    expect(fixture.nativeElement.querySelector('[aria-current="page"]')?.textContent).toContain('Meter A');
    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(fixture.nativeElement.querySelector('#meter-links').hidden).toBe(true);
    expect(fixture.nativeElement.querySelector('.v1-nav__child')).toBeNull();
    fixture.componentRef.setInput('group', { ...group, routeActive: false });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });
});
