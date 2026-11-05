import { TestBed } from '@angular/core/testing';
import { EnergyUseSnapshotModule } from '../energy-use-snapshot/energy-use-snapshot.module';
import { EnergyUseGroupSnapshotComponent } from './energy-use-group-snapshot.component';

it('describes group membership and actual saved years without rollups, showing notes only in detailed mode', () => {
  TestBed.configureTestingModule({ imports: [EnergyUseSnapshotModule] });
  const fixture = TestBed.createComponent(EnergyUseGroupSnapshotComponent);
  fixture.componentRef.setInput('snapshot', { total: 3, matching: 1, active: 2, retired: 1, categories: ['Fan', 'Pump'], sources: ['Electricity'], years: [2020, 2024], notes: 'Shared process' });
  fixture.detectChanges();
  expect(fixture.nativeElement.textContent).toContain('2 active, 1 retired');
  expect(fixture.nativeElement.textContent).toContain('2020, 2024');
  expect(fixture.nativeElement.textContent).not.toContain('2021');
  expect(fixture.nativeElement.textContent).not.toContain('Shared process');
  fixture.componentRef.setInput('detailed', true); fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('Shared process');
});
