import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { WeatherMaintenanceSlideoutComponent } from './weather-maintenance-slideout.component';

describe('WeatherMaintenanceSlideoutComponent', () => {
  it('emits an explicit range and source-check request', () => {
    const fixture = TestBed.configureTestingModule({ imports: [WeatherMaintenanceSlideoutComponent] })
      .createComponent(WeatherMaintenanceSlideoutComponent);
    const component = fixture.componentInstance;
    const requested = vi.fn();
    component.previewRequested.subscribe(requested);
    component.startMonth.set('2026-01');
    component.endMonth.set('2026-03');
    component.sourceCheck.set('all');

    component.requestPreview();

    expect(requested).toHaveBeenCalledWith({
      range: { start: { year: 2026, month: 1 }, end: { year: 2026, month: 3 } },
      sourceCheck: 'all'
    });
  });
});
