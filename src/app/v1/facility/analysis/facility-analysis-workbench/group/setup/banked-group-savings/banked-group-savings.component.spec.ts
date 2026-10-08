import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AnalysisGroup, AnnualAnalysisSummary } from '@data/models/analysis';
import { FacilityAnalysisBankingResultsService } from '../../banking/facility-analysis-banking-results.service';
import { BankedGroupSavingsComponent } from './banked-group-savings.component';

describe('BankedGroupSavingsComponent', () => {
  it('renders source rows, carried transition improvement, dashes, and present markers', () => {
    const sourceGroup = {
      idbGroupId: 'group-a', analysisType: 'regression', isGeneratedModel: true,
      regressionModelYear: 2020, predictorVariables: []
    } as AnalysisGroup;
    const annual = [2020, 2021, 2022].map(year => ({
      year,
      energyUse: 100 - year + 2020,
      adjusted: 100,
      totalSavingsPercentImprovement: year - 2019,
      annualSavingsPercentImprovement: 2,
      cummulativeSavings: 10
    } as AnnualAnalysisSummary));
    TestBed.configureTestingModule({
      imports: [BankedGroupSavingsComponent],
      providers: [{
        provide: FacilityAnalysisBankingResultsService,
        useValue: {
          state: signal({ state: 'ready', annual }),
          sourceGroup: signal(sourceGroup)
        }
      }]
    });
    const fixture = TestBed.createComponent(BankedGroupSavingsComponent);
    fixture.componentRef.setInput('group', {
      idbGroupId: 'group-a', bankedAnalysisYear: 2021, newBaselineYear: 2023
    } as AnalysisGroup);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent.replace(/\s+/g, ' ');
    expect(text).toContain('Banked Group Savings');
    expect(text).toContain('2022');
    expect(text).toContain('2%');
    expect(text).toContain('—');
    expect(text).toContain('Banked source period');
    expect(text).toContain('Transition period');
    expect(text).toContain('Model period');
  });

  it('renders configuration, saving, loading, error, and empty states explicitly', () => {
    const state = signal<any>({ state: 'waiting', reason: 'configuration' });
    TestBed.configureTestingModule({
      imports: [BankedGroupSavingsComponent],
      providers: [{
        provide: FacilityAnalysisBankingResultsService,
        useValue: { state, sourceGroup: signal({ idbGroupId: 'group-a', analysisType: 'absoluteEnergyConsumption' }) }
      }]
    });
    const fixture = TestBed.createComponent(BankedGroupSavingsComponent);
    fixture.componentRef.setInput('group', {
      idbGroupId: 'group-a', bankedAnalysisYear: 2021, newBaselineYear: 2022
    } as AnalysisGroup);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Select valid banking years');

    state.set({ state: 'waiting', reason: 'autosave' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Saving banking configuration');

    state.set({ state: 'waiting', reason: 'blocked' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('validation errors in the selected source analysis');
    expect(fixture.nativeElement.querySelector('.v1-icon--spin')).toBeNull();

    state.set({ state: 'loading', fingerprint: 'one' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Calculating banked savings');

    state.set({ state: 'error', fingerprint: 'one', message: 'Calculation failed' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Calculation failed');

    state.set({ state: 'ready', annual: [] });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No complete source years');
  });
});
