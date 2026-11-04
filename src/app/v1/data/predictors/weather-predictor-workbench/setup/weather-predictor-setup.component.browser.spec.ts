import { TestBed } from '@angular/core/testing';
import { page, userEvent } from 'vitest/browser';
import { PredictorWeatherWorkflowService } from '../../predictor-weather-workflow.service';
import { WEATHER_DATA_TYPE_OPTIONS } from '../../models';
import { createWeatherSetupFixture, savedWeatherSetupGroup } from './weather-predictor-setup.testing';

describe('Saved weather setup selectors in Chromium', () => {
  it('keeps mixed saved types selected through keyboard editing, type changes, and a narrow layout', async () => {
    await page.viewport(1100, 850);
    const types = WEATHER_DATA_TYPE_OPTIONS.map(option => option.value);
    const fixture = createWeatherSetupFixture({ creating: false, group: savedWeatherSetupGroup(types) });
    const root = document.createElement('main');
    root.className = 'v1-root';
    root.style.width = 'min(1000px, 100%)';
    document.body.append(root);
    root.append(fixture.nativeElement);
    try {
      await fixture.whenStable();
      fixture.detectChanges();
      const selects = Array.from(root.querySelectorAll<HTMLSelectElement>('.weather-setup__definition select'));
      expect(selects.map(select => select.value)).toEqual(types);
      expect(selects.map(select => select.selectedOptions[0].textContent?.trim()))
        .toEqual(WEATHER_DATA_TYPE_OPTIONS.map(option => option.label));
      const workflow = TestBed.inject(PredictorWeatherWorkflowService);
      expect(workflow.previewStationGroup).not.toHaveBeenCalled();
      expect(workflow.previewStationSelection).not.toHaveBeenCalled();
      expect(workflow.commitStationGroup).not.toHaveBeenCalled();
      expect(fixture.componentInstance.form.pristine).toBe(true);

      selects[1].focus();
      await userEvent.keyboard('{Tab}');
      const name = selects[1].closest('article')!.querySelector<HTMLInputElement>('input[type="text"]')!;
      expect(document.activeElement).toBe(name);
      name.value = 'Custom cooling predictor';
      name.dispatchEvent(new Event('input', { bubbles: true }));
      fixture.detectChanges();
      expect(selects.map(select => select.value)).toEqual(types);

      selects[1].value = 'relativeHumidity';
      selects[1].dispatchEvent(new Event('change', { bubbles: true }));
      fixture.detectChanges();
      expect(selects[1].value).toBe('relativeHumidity');
      expect(selects[1].closest('article')!.querySelector('.weather-setup__unit strong')?.textContent).toBe('%');
      expect(name.value).toBe('Custom cooling predictor');
      expect(fixture.componentInstance.definitions()[1].predictorGuid).toBe('weather-1');
      expect(workflow.previewStationGroup).not.toHaveBeenCalled();

      await page.viewport(390, 800);
      root.style.width = '360px';
      fixture.detectChanges();
      expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth + 1);
      expect(selects[1].value).toBe('relativeHumidity');
    } finally {
      fixture.destroy();
      root.remove();
      await page.viewport(1100, 850);
    }
  });
});
