import { TestBed } from '@angular/core/testing';
import { page, userEvent } from 'vitest/browser';
import { WeatherReadingMonthEditorComponent } from './weather-reading-month-editor.component';

describe('Weather month draft controls in Chromium', () => {
  it('preserves a manual value and focus as source values and column order refresh', async () => {
    await page.viewport(1100, 850);
    const fixture = TestBed.configureTestingModule({ imports: [WeatherReadingMonthEditorComponent] }).createComponent(WeatherReadingMonthEditorComponent);
    fixture.componentRef.setInput('contextKey', 'account-a/facility-a/station-a');
    fixture.componentRef.setInput('sessionKey', 'add-month-1');
    fixture.componentRef.setInput('columns', [column('heating', 'Heating'), column('humidity', 'Humidity')]);
    const root = document.createElement('main'); root.className = 'v1-root'; document.body.append(root); root.append(fixture.nativeElement);
    try {
      fixture.detectChanges(); await fixture.whenStable();
      fixture.componentInstance.setMonth('2026-02');
      fixture.componentRef.setInput('calculatedMonth', '2026-02');
      fixture.componentRef.setInput('calculatedValues', [
        { predictorGuid: 'heating', amount: 12, weatherDataWarning: false },
        { predictorGuid: 'humidity', amount: 50, weatherDataWarning: false }
      ]);
      fixture.detectChanges();
      const input = root.querySelector<HTMLInputElement>('input[type="number"]')!;
      const override = root.querySelector<HTMLButtonElement>('.weather-month-editor__override')!;
      expect(input.disabled).toBe(true);
      override.click(); fixture.detectChanges();
      input.value = '42'; input.dispatchEvent(new Event('input', { bubbles: true })); input.focus();
      fixture.componentRef.setInput('columns', [column('humidity', 'Humidity renamed'), column('heating', 'Heating')]);
      fixture.componentRef.setInput('calculatedValues', [
        { predictorGuid: 'heating', amount: 18, weatherDataWarning: false },
        { predictorGuid: 'humidity', amount: 55, weatherDataWarning: true }
      ]);
      fixture.detectChanges();
      expect(document.activeElement).toBe(input);
      expect(input.value).toBe('42');
      expect(fixture.componentInstance.values()).toEqual({ heating: '42', humidity: '55' });
      await userEvent.keyboard('{Tab}'); expect(document.activeElement).toBe(override);
      await page.viewport(390, 800); fixture.detectChanges();
      const panel = root.querySelector<HTMLElement>('[role="dialog"]')!;
      expect(panel.scrollWidth).toBeLessThanOrEqual(panel.clientWidth + 1);
    } finally { fixture.destroy(); root.remove(); await page.viewport(1100, 850); }
  });
});

function column(guid: string, name: string): any {
  return { predictor: { guid, name }, typeLabel: name, unit: 'days' };
}
