import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FacilityAnalysisWorkbenchContext } from '../../../facility-analysis-workbench-context.service';
import { FacilityAnalysisResultsService } from '../../calculation/facility-analysis-results.service';
import {
  DEFAULT_ANALYSIS_TABLE_COLUMNS,
  FacilityAnalysisResultsDisplayService
} from '../../presentation/facility-analysis-results-display.service';
import { FacilityAnalysisAnnualComponent } from './facility-analysis-annual.component';

describe('FacilityAnalysisAnnualComponent', () => {
  it('aggregates group markers and suppresses facility transition-derived values', () => {
    const transitionGroupRow = {
      year: 2024, isBanked: true, isIntermediateBanked: true, savingsBanked: 4
    };
    TestBed.configureTestingModule({
      imports: [FacilityAnalysisAnnualComponent],
      providers: [
        {
          provide: FacilityAnalysisWorkbenchContext,
          useValue: {
            analysis: signal({ analysisCategory: 'energy', energyUnit: 'MMBtu', hasBanking: true }),
            analysisGuid: signal('analysis-a'),
            hasBlockingErrors: signal(false),
            workspace: { facilityPredictors: signal([]) }
          }
        },
        {
          provide: FacilityAnalysisResultsService,
          useValue: {
            state: signal({
              state: 'ready',
              annual: [{
                year: 2024, energyUse: 200, adjusted: 99999, predictorUsage: [],
                totalSavingsPercentImprovement: 6
              }],
              groups: [{ annualAnalysisSummaryData: [transitionGroupRow] }]
            })
          }
        },
        {
          provide: FacilityAnalysisResultsDisplayService,
          useValue: { annualColumns: signal(structuredClone(DEFAULT_ANALYSIS_TABLE_COLUMNS)) }
        }
      ]
    });
    const fixture = TestBed.createComponent(FacilityAnalysisAnnualComponent);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent.replace(/\s+/g, ' ');
    expect(text).toContain('Transition period');
    expect(text).toContain('Banked savings added');
    expect(text).not.toContain('99,999');
    expect(text).not.toContain('Model period');
    expect(fixture.componentInstance.useChartRows()[0].values['calculated']).toBeNull();
    expect(fixture.componentInstance.improvementChartRows()[0].values['annualImprovement']).toBeNull();
  });
});
