import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CopyTableService } from '@shared/helper-services/copy-table.service';
import { FacilityAnalysisWorkbenchContext } from '../../../facility-analysis-workbench-context.service';
import { FacilityAnalysisResultsService } from '../../calculation/facility-analysis-results.service';
import {
  DEFAULT_ANALYSIS_TABLE_COLUMNS,
  FacilityAnalysisResultsDisplayService
} from '../../presentation/facility-analysis-results-display.service';
import { FacilityAnalysisMonthlyTableComponent } from './facility-analysis-monthly-table.component';

describe('FacilityAnalysisMonthlyTableComponent', () => {
  let fixture: ComponentFixture<FacilityAnalysisMonthlyTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FacilityAnalysisMonthlyTableComponent],
      providers: [
        { provide: CopyTableService, useValue: { copyTable: vi.fn() } },
        {
          provide: FacilityAnalysisWorkbenchContext,
          useValue: {
            analysis: signal({ analysisCategory: 'energy', energyUnit: 'MMBtu', hasBanking: false }),
            analysisGuid: signal('analysis-a'),
            hasBlockingErrors: signal(false),
            workspace: { facilityPredictors: signal([]) }
          }
        },
        {
          provide: FacilityAnalysisResultsService,
          useValue: { state: signal({ state: 'ready', monthly: monthlyRows(30) }) }
        },
        {
          provide: FacilityAnalysisResultsDisplayService,
          useValue: { monthlyColumns: signal(structuredClone(DEFAULT_ANALYSIS_TABLE_COLUMNS)) }
        }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(FacilityAnalysisMonthlyTableComponent);
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('uses a typed page-size control and resets pagination after a rendered selection', () => {
    const component = fixture.componentInstance;
    component.currentPage.set(2);
    fixture.detectChanges();

    selectPageSize(fixture.nativeElement, 24);
    TestBed.flushEffects();
    fixture.detectChanges();

    expect(component.pageSizeControl.value).toBe(24);
    expect(component.pageSize()).toBe(24);
    expect(component.currentPage()).toBe(1);
    expect(component.displayedRows()).toHaveLength(24);
  });
});

function selectPageSize(host: HTMLElement, value: number): void {
  const select = host.querySelector('select');
  const option = Array.from(select?.options ?? []).find(item => item.textContent?.trim() === String(value));
  expect(select).not.toBeNull();
  expect(option).toBeDefined();
  select!.value = option!.value;
  select!.dispatchEvent(new Event('change'));
}

function monthlyRows(count: number): any[] {
  return Array.from({ length: count }, (_, index) => ({
    date: new Date(2024, index, 1), fiscalYear: 2024 + Math.floor(index / 12),
    energyUse: index, predictorUsage: [], missingValueWarning: false
  }));
}
