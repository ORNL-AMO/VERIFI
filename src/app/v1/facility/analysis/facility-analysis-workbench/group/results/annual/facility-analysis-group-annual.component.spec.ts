import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FacilityAnalysisGroupContext } from '../../facility-analysis-group-context.service';
import { FacilityAnalysisGroupResultsService } from '../calculation/facility-analysis-group-results.service';
import {
  DEFAULT_ANALYSIS_TABLE_COLUMNS,
  FacilityAnalysisResultsDisplayService
} from '../../../results/presentation/facility-analysis-results-display.service';
import { FacilityAnalysisGroupAnnualComponent } from './facility-analysis-group-annual.component';

describe('FacilityAnalysisGroupAnnualComponent', () => {
  it('renders banking/model markers and suppresses transition-derived table values', () => {
    const group = signal({
      idbGroupId: 'group-a', analysisType: 'regression', isGeneratedModel: true,
      regressionModelYear: 2023, predictorVariables: []
    });
    TestBed.configureTestingModule({
      imports: [FacilityAnalysisGroupAnnualComponent],
      providers: [
        {
          provide: FacilityAnalysisGroupContext,
          useValue: {
            group,
            workbench: {
              facility: signal({ fiscalYear: 'calendarYear', fiscalYearMonth: 0, fiscalYearCalendarEnd: true })
            },
            autosave: { draft: signal({ analysisCategory: 'energy', energyUnit: 'MMBtu', hasBanking: true }) }
          }
        },
        {
          provide: FacilityAnalysisGroupResultsService,
          useValue: {
            hasBlockingErrors: signal(false),
            state: signal({
              state: 'ready',
              annual: [
                {
                  year: 2023, energyUse: 100, adjusted: 95, predictorUsage: [],
                  isBanked: true, isIntermediateBanked: false, savingsBanked: 5
                },
                {
                  year: 2024, energyUse: 110, adjusted: 99999, predictorUsage: [],
                  isBanked: true, isIntermediateBanked: true, savingsBanked: 0,
                  totalSavingsPercentImprovement: 5
                }
              ]
            })
          }
        },
        {
          provide: FacilityAnalysisResultsDisplayService,
          useValue: { annualColumns: signal(structuredClone(DEFAULT_ANALYSIS_TABLE_COLUMNS)) }
        }
      ]
    });
    const fixture = TestBed.createComponent(FacilityAnalysisGroupAnnualComponent);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent.replace(/\s+/g, ' ');
    expect(text).toContain('Banked source period');
    expect(text).toContain('Banked savings added');
    expect(text).toContain('Model period');
    expect(text).toContain('Transition period');
    expect(text).not.toContain('99,999');
    expect(fixture.componentInstance.useChartRows()[1].values['calculated']).toBeNull();
  });
});
