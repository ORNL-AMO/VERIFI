import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { CopyTableService } from '@shared/helper-services/copy-table.service';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { presentFindings } from '@app/v1/status/status.catalog';
import { makeFinding } from '@app/v1/status/status.models';
import { FacilityPredictorsWorkspaceService } from '../../facility-predictors-workspace.service';
import { PredictorWorkspaceActionsService } from '../../predictor-workspace-actions.service';
import { WeatherPredictorReadingsComponent } from './weather-predictor-readings.component';

describe('WeatherPredictorReadingsComponent', () => {
  it('renders dynamic predictor columns with status icons beside their values', () => {
    const predictors = [
      { guid: 'hdd', name: 'HDD 55', predictorType: 'Weather', weatherDataType: 'HDD', accountId: 'a', facilityId: 'f' },
      { guid: 'humidity', name: 'Humidity', predictorType: 'Weather', weatherDataType: 'relativeHumidity', accountId: 'a', facilityId: 'f' }
    ];
    const fixture = setup(predictors, [{
      id: 1, guid: 'reading', predictorId: 'hdd', accountId: 'a', facilityId: 'f',
      year: 2026, month: 1, amount: 12, weatherDataWarning: true, weatherOverride: false
    }]);

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('HDD 55');
    expect(text).toContain('Humidity');
    expect(text).toContain('12');
    expect(text).toContain('—');
    expect(fixture.nativeElement.querySelector('[title="Incomplete source data"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[title="Missing predictor record"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('thead th')).toHaveLength(4);
    expect(text).not.toContain('Station data');
    expect(text).not.toContain('Monthly weather readings');
    expect(text).not.toContain('Each row saves every included predictor');
  });

  it('lists grouped reading checks and explains the tab attention total', () => {
    const predictors = [
      { guid: 'hdd', name: 'HDD 55', predictorType: 'Weather', weatherDataType: 'HDD' },
      { guid: 'humidity', name: 'Humidity', predictorType: 'Weather', weatherDataType: 'relativeHumidity' }
    ];
    const entity = (predictor: any) => ({
      kind: 'predictor' as const, guid: predictor.guid, name: predictor.name,
      accountGuid: 'account-a', facilityGuid: 'facility-a'
    });
    const findings = presentFindings(predictors.flatMap(predictor => [
      makeFinding('predictor.weather.warning', 'warning', 'quality', entity(predictor)),
      makeFinding('predictor.currency.stale', 'warning', 'currency', entity(predictor), {
        latestPeriod: '2025-12', thresholdMonths: 3
      })
    ]));

    const fixture = setup(predictors, [], vi.fn(), findings);
    const status = fixture.nativeElement.querySelector('.weather-readings__status') as HTMLElement;

    expect(status.textContent).toContain('4 checks across 2 predictors');
    expect(status.textContent).toContain('Update stale predictor data');
    expect(status.textContent).toContain('Review weather data');
    expect(status.textContent).toContain('2 predictors: HDD 55, Humidity');
    expect(status.querySelectorAll('li')).toHaveLength(2);
  });

  it('paginates readings and changes the number of visible rows', () => {
    const predictors = [weatherPredictor()];
    const readings = Array.from({ length: 12 }, (_, index) => weatherReading(index + 1));
    const fixture = setup(predictors, readings);
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelectorAll('tbody tr')).toHaveLength(10);
    expect(root.querySelector('ngb-pagination')).not.toBeNull();

    const pageSize = root.querySelector<HTMLSelectElement>('.weather-readings__control select')!;
    pageSize.value = '25';
    pageSize.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(fixture.componentInstance.currentPage()).toBe(1);
    expect(root.querySelectorAll('tbody tr')).toHaveLength(12);
    expect(root.querySelector('ngb-pagination')).toBeNull();
  });

  it('copies the displayed table without the row action column', () => {
    vi.useFakeTimers();
    try {
      const copyTable = vi.fn();
      const fixture = setup([weatherPredictor()], [weatherReading(1)], copyTable);
      const root = fixture.nativeElement as HTMLElement;
      const copyButton = Array.from(root.querySelectorAll<HTMLButtonElement>('button'))
        .find(button => button.textContent?.includes('Copy Table'))!;

      copyButton.click();
      fixture.detectChanges();
      expect(root.querySelector('.weather-readings__actions')).toBeNull();

      vi.advanceTimersByTime(200);
      expect(copyTable).toHaveBeenCalledOnce();
      expect((copyTable.mock.calls[0][0] as { nativeElement: HTMLTableElement }).nativeElement.tagName).toBe('TABLE');
    } finally {
      vi.useRealTimers();
    }
  });
});

function setup(predictors: any[], readings: any[], copyTable = vi.fn(), statusFindings: any[] = []) {
  TestBed.configureTestingModule({
    imports: [WeatherPredictorReadingsComponent],
    providers: [
      { provide: FacilityPredictorsWorkspaceService, useValue: {
        canWrite: signal(true), hasPending: signal(false), revision: signal(1),
        selectedWeatherGroup: signal({ routeKey: 'station:A', predictors, statusFindings }),
        selectedWeatherPredictors: signal(predictors), selectedWeatherReadings: signal(readings)
      } },
      { provide: PredictorWorkspaceActionsService, useValue: { applyWeatherStationMonth: vi.fn() } },
      { provide: UnsavedChangesService, useValue: { register: vi.fn(() => vi.fn()), confirmDiscard: vi.fn() } },
      { provide: CopyTableService, useValue: { copyTable } }
    ]
  });
  const fixture = TestBed.createComponent(WeatherPredictorReadingsComponent);
  fixture.detectChanges();
  return fixture;
}

function weatherPredictor() {
  return { guid: 'hdd', name: 'HDD 55', predictorType: 'Weather', weatherDataType: 'HDD', accountId: 'a', facilityId: 'f' };
}

function weatherReading(month: number) {
  return {
    id: month, guid: `reading-${month}`, predictorId: 'hdd', accountId: 'a', facilityId: 'f',
    year: 2025, month, amount: month, weatherDataWarning: false, weatherOverride: false
  };
}
