import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EnergyUseSnapshotModule } from '../energy-use-snapshot/energy-use-snapshot.module';
import { EnergyUseGroupSnapshotComponent } from './energy-use-group-snapshot.component';
import type { InventoryEnergyUseGroupSnapshot } from '../inventory.models';

function setup() {
  TestBed.configureTestingModule({ imports: [EnergyUseSnapshotModule], providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(EnergyUseGroupSnapshotComponent);
  const snapshot: InventoryEnergyUseGroupSnapshot = {
    equipmentTypes: [{ label: 'Pump', icon: 'pump' }], categories: ['Pump'], sources: ['Electricity'], years: [2020, 2024], meterGroups: [{ guid: 'meter-group', label: 'Production meters', route: ['/meter-grouping', 'meter-group', 'monthly-table'] }],
    items: [{ guid: 'pump', name: 'Pump A', icon: 'pump', route: ['/energy-uses', 'pump', 'settings'] }] };
  fixture.componentRef.setInput('snapshot', snapshot); fixture.componentRef.setInput('groupName', 'Production'); fixture.componentRef.setInput('browseId', 'group'); fixture.detectChanges();
  return { fixture, snapshot, component: fixture.componentInstance, root: fixture.nativeElement as HTMLElement };
}
it('shows only icon links in Summary and sends ordinary clicks through the feature navigation boundary', () => {
  const { fixture, root, component, snapshot } = setup(), navigate = vi.fn(); component.navigationRequested.subscribe(navigate);
  expect(root.querySelector('dl')).toBeNull();
  expect(root.querySelector('ul')?.getAttribute('aria-label')).toBe('Energy uses in Production');
  const link = root.querySelector('a')!;
  expect(link.textContent).toContain('Pump A'); expect(link.querySelector('app-ui-icon')).not.toBeNull();
  expect(link.getAttribute('href')).toBe('/energy-uses/pump/settings'); expect(link.dataset['browseId']).toBe('group');
  link.click(); expect(navigate).toHaveBeenCalledWith(snapshot.items[0].route);
  navigate.mockClear(); const event = new MouseEvent('click', { button: 0, ctrlKey: true, cancelable: true });
  component.open(event, snapshot.items[0].route); expect(event.defaultPrevented).toBe(false); expect(navigate).not.toHaveBeenCalled();
  fixture.destroy();
});
it('keeps group facts and meter links in Detailed while hiding notes and lifecycle, including print output', () => {
  const { fixture, root } = setup();
  fixture.componentRef.setInput('detailed', true); fixture.componentRef.setInput('print', true); fixture.detectChanges();
  expect(root.textContent).not.toContain('Lifecycle'); expect(root.textContent).not.toContain('1 active, 1 retired'); expect(root.textContent).toContain('2020, 2024');
  expect(root.querySelector('app-inventory-meter-group-links a')?.getAttribute('href')).toBe('/meter-grouping/meter-group/monthly-table'); expect(root.querySelector('ul')?.hasAttribute('tabindex')).toBe(false);
  expect(root.querySelector('a')?.hasAttribute('data-browse-id')).toBe(false); fixture.destroy();
});
