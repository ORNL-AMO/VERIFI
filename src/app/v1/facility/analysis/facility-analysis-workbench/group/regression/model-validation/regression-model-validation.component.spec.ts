import { TestBed } from '@angular/core/testing';
import { AnalysisGroup, JStatRegressionModel, MonthlyAnalysisSummaryData } from '@data/models/analysis';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { RegressionModelValidationComponent } from './regression-model-validation.component';

describe('RegressionModelValidationComponent', () => {
  it('shows candidate and selected model series while comparing models', async () => {
    await TestBed.configureTestingModule({ imports: [RegressionModelValidationComponent] }).compileComponents();
    const fixture = TestBed.createComponent(RegressionModelValidationComponent);
    const date = new Date(2024, 0, 1);
    fixture.componentRef.setInput('analysis', { analysisCategory: 'energy', energyUnit: 'MMBtu' } as IdbAnalysisItem);
    fixture.componentRef.setInput('group', {
      regressionStartYear: 2024, regressionModelStartMonth: 0,
      regressionEndYear: 2024, regressionModelEndMonth: 11
    } as AnalysisGroup);
    fixture.componentRef.setInput('state', {
      state: 'ready', source: 'generated',
      model: { modelId: 'candidate', modelYear: 2024, SEPValidation: [] } as unknown as JStatRegressionModel,
      monthly: [{ date, fiscalYear: 2024, energyUse: 14, modeledEnergy: 10 } as MonthlyAnalysisSummaryData],
      comparison: {
        model: { modelId: 'selected' } as JStatRegressionModel,
        monthly: [{ date, fiscalYear: 2024, energyUse: 14, modeledEnergy: 12 } as MonthlyAnalysisSummaryData]
      }
    });

    const series = (fixture.componentInstance.chartOption() as any).series;
    expect(series.map((item: any) => item.name)).toEqual([
      'Actual energy', 'Candidate modeled energy', 'Selected modeled energy'
    ]);
    expect(series[2].data).toEqual([12]);
    expect(series[1].markArea.data).toEqual([[
      { xAxis: 0 },
      { xAxis: 0 }
    ]]);
  });
});
