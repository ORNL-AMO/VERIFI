import { TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { page, userEvent } from 'vitest/browser';
import { PORTFOLIO_PALETTES, textContrast } from '@app/v1/shared/inventory/inventory-browser-test.helpers';
import { ResourcePickerComponent } from './resource-picker.component';
import { ResourcePickerModule } from './resource-picker.module';

describe('visualization resource picker in Chromium', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('supports keyboard selection and local filtering of a large list in narrow themed panels', async () => {
    await page.viewport(1280, 900);
    TestBed.configureTestingModule({ imports: [ResourcePickerModule] });
    const fixture = TestBed.createComponent(ResourcePickerComponent);
    const control = new FormControl(['meter-0', 'missing-meter'], { nonNullable: true });
    const longName = 'ManufacturingFacilityWithAnUnbrokenVeryLongNameForResourceWrapping'.repeat(3);
    fixture.componentRef.setInput('control', control); fixture.componentRef.setInput('label', 'Meters');
    fixture.componentRef.setInput('options', Array.from({ length: 150 }, (_, index) => ({ guid: `meter-${index}`,
      label: index === 0 ? longName : `Facility ${Math.floor(index / 10)} / Meter ${index}` })));
    const root = fixture.nativeElement as HTMLElement;
    root.className = 'v1-root'; root.style.width = 'min(360px, calc(100vw - 32px))';
    fixture.detectChanges();
    try {
      const options = root.querySelector<HTMLElement>('.resource-picker__options')!;
      expect(options.querySelectorAll('button')).toHaveLength(152);
      expect(options.scrollHeight).toBeGreaterThan(options.clientHeight);
      const row = options.querySelectorAll<HTMLButtonElement>('.resource-picker__option')[1];
      row.focus(); await userEvent.keyboard('{Enter}'); fixture.detectChanges();
      expect(control.value).toEqual(['meter-0', 'missing-meter', 'meter-1']);
      expect(row.getAttribute('aria-checked')).toBe('true');
      await userEvent.keyboard(' '); fixture.detectChanges();
      expect(control.value).toEqual(['meter-0', 'missing-meter']);
      expect(control.dirty).toBe(true);
      const filter = root.querySelector<HTMLInputElement>('input[type="search"]')!;
      filter.focus(); await userEvent.type(filter, 'Meter 149'); fixture.detectChanges();
      expect(options.querySelectorAll('button')).toHaveLength(2);
      expect(options.textContent).toContain('Meter 149');
      expect(control.value).toEqual(['meter-0', 'missing-meter']);
      fixture.componentInstance.filter.setValue(''); fixture.detectChanges();
      expect(root.querySelector('.resource-picker__option--unavailable')!.textContent).toContain('Unavailable: missing-meter');

      for (const width of [1280, 390]) {
        await page.viewport(width, 900);
        for (const palette of PORTFOLIO_PALETTES) {
          for (const mode of ['', 'v1-theme-dark', 'v1-contrast-strong', 'v1-theme-dark v1-contrast-strong']) {
            root.className = `v1-root v1-palette-${palette} ${mode}`;
            expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth);
            expect(options.scrollWidth).toBeLessThanOrEqual(options.clientWidth);
            const rows = options.querySelectorAll<HTMLButtonElement>('button');
            for (const button of [rows[0], rows[1], rows[rows.length - 1]]) {
              expect(textContrast(button)).toBeGreaterThanOrEqual(4.5);
              expect(button.getBoundingClientRect().right).toBeLessThanOrEqual(root.getBoundingClientRect().right + 1);
            }
          }
        }
        await page.screenshot({ element: root, path: `../../../../../../.angular/vis3-alignment/resource-picker-${width}.png` });
      }

      control.disable({ emitEvent: false }); fixture.changeDetectorRef.markForCheck(); fixture.detectChanges();
      expect([...root.querySelectorAll<HTMLButtonElement>('.resource-picker__option, .resource-picker__all')].every(button => button.disabled)).toBe(true);
      filter.focus(); await userEvent.keyboard('{Tab}');
      expect(document.activeElement?.classList.contains('resource-picker__option')).toBe(false);
      expect(control.value).toEqual(['meter-0', 'missing-meter']);
    } finally { fixture.destroy(); await page.viewport(1280, 900); }
  });
});
