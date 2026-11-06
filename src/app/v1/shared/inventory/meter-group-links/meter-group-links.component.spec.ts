import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EnergyUseSnapshotModule } from '../energy-use-snapshot/energy-use-snapshot.module';
import { MeterGroupLinksComponent } from './meter-group-links.component';

it('shows committed meter group links and preserves unavailable links without destinations', () => {
  TestBed.configureTestingModule({ imports: [EnergyUseSnapshotModule], providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(MeterGroupLinksComponent), navigate = vi.fn();
  const route = ['/v1', 'workspace', 'facility', 'plant', 'data', 'meter-grouping', 'meters', 'monthly-table'];
  fixture.componentRef.setInput('groups', [{ guid: 'meters', label: 'Electricity meters', route }, { guid: 'missing', label: 'Meter group unavailable' }]);
  fixture.componentRef.setInput('browseId', 'equipment'); fixture.componentInstance.navigationRequested.subscribe(navigate); fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement, link = root.querySelector('a')!;
  expect(root.querySelectorAll('li')).toHaveLength(2); expect(root.querySelectorAll('a')).toHaveLength(1);
  expect(root.querySelectorAll('app-ui-icon')).toHaveLength(2); expect(link.getAttribute('href')).toBe(route.join('/')); expect(link.dataset['browseId']).toBe('equipment');
  link.click(); expect(navigate).toHaveBeenCalledWith(route);
  navigate.mockClear(); const event = new MouseEvent('click', { button: 0, ctrlKey: true, cancelable: true }); fixture.componentInstance.open(event, route);
  expect(event.defaultPrevented).toBe(false); expect(navigate).not.toHaveBeenCalled();
  fixture.componentRef.setInput('print', true); fixture.detectChanges(); expect(link.hasAttribute('data-browse-id')).toBe(false);
  fixture.componentRef.setInput('groups', []); fixture.detectChanges(); expect(root.textContent).toContain('None linked'); fixture.destroy();
});
