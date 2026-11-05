import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { page } from 'vitest/browser';
import { EnergyUseSnapshotComponent } from './energy-use-snapshot.component';
import { EnergyUseSnapshotModule } from './energy-use-snapshot.module';

describe('energy use metadata wrapping', () => {
  it.each(['', 'v1-theme-dark', 'v1-theme-dark v1-contrast-strong'])('reveals long metadata instead of clipping it in theme %s', async theme => {
    await page.viewport(1000, 900);
    TestBed.configureTestingModule({ imports: [EnergyUseSnapshotModule], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(EnergyUseSnapshotComponent);
    fixture.componentRef.setInput('snapshot', {
      sources: ['Electricity', 'Natural Gas', 'Other Fuels', 'Other Energy', 'Water Intake', 'Water Discharge'],
      group: 'ProcessHeatingAndProductionEquipmentWithAnUnbrokenLongGroupName',
      meterGroups: [{ guid: 'meters', label: 'ProductionElectricityMetersWithAnUnbrokenLongName', route: ['/meter-grouping', 'meters', 'monthly-table'] }],
      years: Array.from({ length: 24 }, (_, index) => 2001 + index),
      notes: 'Long saved notes must remain readable without truncation. '.repeat(5) + '\nA second saved line.'
    });
    fixture.componentRef.setInput('detailed', true);
    const root = document.createElement('main');
    root.className = `v1-root ${theme}`;
    Object.assign(root.style, { minHeight: '0', padding: '12px', boxSizing: 'border-box' });
    document.body.append(root); root.append(fixture.nativeElement);
    try {
      for (const width of [320, 760]) {
        root.style.width = `${width}px`;
        fixture.detectChanges(); await fixture.whenStable();
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
        const values = [...root.querySelectorAll<HTMLElement>('dd')];
        expect(values).toHaveLength(5);
        for (const value of values) {
          expect(getComputedStyle(value).whiteSpace).toBe('pre-line');
          expect(getComputedStyle(value).overflowX).not.toBe('hidden');
          expect(value.scrollWidth).toBeLessThanOrEqual(value.clientWidth + 1);
          expect(value.scrollHeight).toBeLessThanOrEqual(value.clientHeight + 1);
        }
        const notes = values.at(-1)!;
        expect(notes.textContent).toContain('A second saved line.');
        expect(notes.clientHeight).toBeGreaterThan(parseFloat(getComputedStyle(notes).lineHeight) * 2);
        expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth + 1);
      }
    } finally { fixture.destroy(); root.remove(); }
  });
});
