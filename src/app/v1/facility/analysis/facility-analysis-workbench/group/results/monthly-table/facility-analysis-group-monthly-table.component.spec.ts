import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CopyTableService } from '@shared/helper-services/copy-table.service';
import { FacilityAnalysisGroupContext } from '../../facility-analysis-group-context.service';
import { FacilityAnalysisGroupResultsService } from '../calculation/facility-analysis-group-results.service';
import {
  DEFAULT_ANALYSIS_TABLE_COLUMNS,
  FacilityAnalysisResultsDisplayService
} from '../../../results/presentation/facility-analysis-results-display.service';
import { FacilityAnalysisGroupMonthlyTableComponent } from './facility-analysis-group-monthly-table.component';

describe('FacilityAnalysisGroupMonthlyTableComponent', () => {
  let fixture: ComponentFixture<FacilityAnalysisGroupMonthlyTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FacilityAnalysisGroupMonthlyTableComponent],
      providers: [
        { provide: CopyTableService, useValue: { copyTable: vi.fn() } },
        {
          provide: FacilityAnalysisGroupContext,
          useValue: {
            group: signal({ idbGroupId: 'group-a', predictorVariables: [] }),
            autosave: { draft: signal({ analysisCategory: 'energy', energyUnit: 'MMBtu', hasBanking: false }) }
          }
        },
        {
          provide: FacilityAnalysisGroupResultsService,
          useValue: {
            state: signal({ state: 'ready', monthly: monthlyRows(30) }),
            hasBlockingErrors: signal(false)
          }
        },
        {
          provide: FacilityAnalysisResultsDisplayService,
          useValue: { monthlyColumns: signal(structuredClone(DEFAULT_ANALYSIS_TABLE_COLUMNS)) }
        }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(FacilityAnalysisGroupMonthlyTableComponent);
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

  it('renders banked, savings, transition, and model markers and suppresses transition-derived values', () => {
    const context = TestBed.inject(FacilityAnalysisGroupContext) as any;
    context.group.set({
      idbGroupId: 'group-a', analysisType: 'regression', isGeneratedModel: true,
      regressionModelYear: 2024, predictorVariables: []
    });
    context.autosave.draft.set({ analysisCategory: 'energy', energyUnit: 'MMBtu', hasBanking: true });
    const rows = [
      {
        date: new Date(2024, 0, 1), fiscalYear: 2024, energyUse: 10, modeledEnergy: 11, adjusted: 11,
        predictorUsage: [], isBanked: true, isIntermediateBanked: false, savingsBanked: 2,
        rollingSavings: 2, rolling12MonthImprovement: 2, missingValueWarning: false
      },
      {
        date: new Date(2024, 1, 1), fiscalYear: 2024, energyUse: 12, modeledEnergy: 98765, adjusted: 98765,
        predictorUsage: [], isBanked: true, isIntermediateBanked: true, savingsBanked: 0,
        rollingSavings: 3, rolling12MonthImprovement: 3, missingValueWarning: false
      }
    ];
    (TestBed.inject(FacilityAnalysisGroupResultsService) as any).state.set({ state: 'ready', monthly: rows });
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent.replace(/\s+/g, ' ');
    expect(text).toContain('Banked source period');
    expect(text).toContain('Banked savings added');
    expect(text).toContain('Transition period');
    expect(text).toContain('Model period');
    expect(text).toContain('—');
    expect(text).not.toContain('98,765');
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
