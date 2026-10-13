import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ContributionHeatmapComponent } from '@app/v1/shared/analysis-results/contribution-heatmap/contribution-heatmap.component';
import { FacilityAnalysisWorkbenchContext } from '../../../facility-analysis-workbench-context.service';
import { FacilityAnalysisResultsService } from '../../calculation/facility-analysis-results.service';
import { FacilityAnalysisGroupContributionsComponent } from './facility-analysis-group-contributions.component';

describe('FacilityAnalysisGroupContributionsComponent', () => {
  it('supplies the shared heatmap with the same group percentages as its table', () => {
    TestBed.overrideComponent(ContributionHeatmapComponent, { set: { template: '' } });
    TestBed.configureTestingModule({ imports: [FacilityAnalysisGroupContributionsComponent], providers: [
      { provide: FacilityAnalysisWorkbenchContext, useValue: {
        hasBlockingErrors: signal(false), analysis: signal({ analysisCategory: 'energy', energyUnit: 'MMBtu' }),
        meterGroups: signal([{ guid: 'group-a', name: 'Electricity' }])
      } },
      { provide: FacilityAnalysisResultsService, useValue: { state: signal({ state: 'ready',
        annual: [{ year: 2024, savings: 25, adjusted: 100, totalSavingsPercentImprovement: 25 }],
        groups: [{ group: { idbGroupId: 'group-a', analysisType: 'absoluteEnergyConsumption' },
          annualAnalysisSummaryData: [{ year: 2024, savings: 25, totalSavingsPercentImprovement: 25 }] }]
      }) } }
    ] });
    const fixture = TestBed.createComponent(FacilityAnalysisGroupContributionsComponent);
    fixture.detectChanges();
    const heatmap = fixture.debugElement.query(By.directive(ContributionHeatmapComponent)).componentInstance as ContributionHeatmapComponent;
    expect(heatmap.view()).toEqual({ labels: ['Electricity'],
      years: [{ year: 2024, totalContributionPercent: 25, contributions: [25] }] });
    expect(heatmap.scopeLabel()).toBe('Group');
    expect(heatmap.downloadFileName()).toBe('facility-group-contributions');
    expect(fixture.nativeElement.querySelector('table').textContent).toContain('Electricity');
    expect(fixture.nativeElement.querySelector('table').textContent).toContain('25%');
  });
});
