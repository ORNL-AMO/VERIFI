import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { InventoryTileComponent } from '../inventory-tile/inventory-tile.component';
import { buildEnergyUseInventory } from '@app/v1/data/energy-uses/inventory/energy-use-inventory.models';
import { energyUseFacility, energyUseGroup, energyUseItem } from '@app/v1/data/energy-uses/energy-uses.testing';

describe('energy use cards', () => {
  it('adds saved metadata at each detail level and keeps native item and owner destinations', () => {
    TestBed.configureTestingModule({ imports: [InventoryTileComponent], providers: [provideRouter([])] });
    const entry = buildEnergyUseInventory('account-a', [energyUseFacility()], [energyUseItem()], [energyUseGroup()])[0];
    const fixture = TestBed.createComponent(InventoryTileComponent);
    fixture.componentRef.setInput('tile', { guid: entry.guid, name: entry.name, icon: 'tools', chip: entry.category,
      route: ['/energy', entry.guid, 'settings'], owner: { facilityGuid: entry.facility.guid, label: entry.facility.name, route: ['/inventory'] },
      status: { tone: 'neutral', icon: 'info', label: '' }, energyUseSnapshot: entry.snapshot });
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('North plant'); expect(root.textContent).not.toContain('Saved annual data');
    expect(root.querySelector('.portfolio-tile__status')).toBeNull();
    expect(root.querySelector('.portfolio-tile__name')?.getAttribute('href')).toBe('/energy/energy-a/settings');
    expect(root.querySelector('dl')).toBeNull();
    fixture.componentRef.setInput('level', 'summary'); fixture.detectChanges();
    expect(root.textContent).toContain('Production'); expect(root.textContent).toContain('Electricity'); expect(root.textContent).not.toContain('Active'); expect(root.textContent).not.toContain('Lifecycle'); expect(root.textContent).toContain('Meter groups');
    expect(root.textContent).not.toContain('Saved notes');
    fixture.componentRef.setInput('level', 'detailed'); fixture.detectChanges();
    expect(root.textContent).toContain('2024'); expect(root.textContent).toContain('Saved notes');
    fixture.componentRef.setInput('print', true); fixture.detectChanges();
    expect(root.querySelector('button,input')).toBeNull();
  });
});
