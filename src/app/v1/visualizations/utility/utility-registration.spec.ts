import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { PreviewRegistry } from '../preview/preview-registry';
import { VisualizationsModule } from '../visualizations.module';
import { visualizationSnapshot } from '../testing/visualization-test-fixtures';
import { UtilitySourceProvider } from './utility-source-provider.service';
import { TimeSeriesPresenter } from '../time-series/time-series.presenter';

describe('production utility feature composition', () => {
  afterEach(() => TestBed.resetTestingModule());
  it('registers provider, dates and chart presenter without calculation demand', () => {
    const store = new AccountWorkspaceStore(); store.publish(visualizationSnapshot());
    const calendarizeBase = vi.fn();
    TestBed.configureTestingModule({ imports: [VisualizationsModule], providers: [
      { provide: AccountWorkspaceStore, useValue: store }, { provide: WorkspaceCalendarizationService, useValue: { calendarizeBase } }
    ] });
    const registry = TestBed.inject(PreviewRegistry);
    expect(registry.provider('utility')).toBeInstanceOf(UtilitySourceProvider);
    expect(registry.presenter('time-series')).toBeInstanceOf(TimeSeriesPresenter);
    expect(registry.dates).toBeDefined(); expect(calendarizeBase).not.toHaveBeenCalled();
  });
});
