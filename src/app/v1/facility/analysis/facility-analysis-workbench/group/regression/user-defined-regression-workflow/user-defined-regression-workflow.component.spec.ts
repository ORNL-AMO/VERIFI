import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AnalysisGroup } from '@data/models/analysis';
import { FacilityAnalysisRegressionController } from '../facility-analysis-regression.controller';
import { FacilityAnalysisRegressionFacade } from '../facility-analysis-regression.facade';
import { UserDefinedRegressionWorkflowComponent } from './user-defined-regression-workflow.component';

describe('UserDefinedRegressionWorkflowComponent', () => {
  it('hydrates typed controls and renders the equation and period', async () => {
    const group = signal({
      isGeneratedModel: false, regressionConstant: 2, regressionModelStartMonth: 0, regressionStartYear: 2024,
      regressionModelEndMonth: 11, regressionEndYear: 2024,
      predictorVariables: [{ id: 'production', name: 'Production', productionInAnalysis: true, regressionCoefficient: 3 }]
    } as AnalysisGroup);
    const facade = {
      group, analysis: signal({ analysisCategory: 'energy', energyUnit: 'MMBtu' }),
      months: [{ name: 'January', monthNumValue: 0 }, { name: 'December', monthNumValue: 11 }],
      yearOptions: signal([2024]), hasUserDefinedDataIssue: signal(false), generatedModels: signal([]),
      validation: { state: signal({ state: 'idle', source: 'user-defined' }), retry: vi.fn() },
      setPredictorSelected: vi.fn(), changeMaxVariables: vi.fn(), setConstant: vi.fn(), setRange: vi.fn(),
      setNotes: vi.fn(), setCoefficient: vi.fn(), changeMethod: vi.fn(), inspectModel: vi.fn(), clearReview: vi.fn(), selectModel: vi.fn()
    };
    await TestBed.configureTestingModule({
      imports: [UserDefinedRegressionWorkflowComponent],
      providers: [{ provide: FacilityAnalysisRegressionFacade, useValue: facade }, FacilityAnalysisRegressionController]
    }).compileComponents();
    const fixture = TestBed.createComponent(UserDefinedRegressionWorkflowComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.v1-user-regression__equation')?.textContent).toContain('2 + (3 × Production)');
    expect((element.querySelector('#model-start-month') as HTMLSelectElement).selectedOptions[0].textContent).toContain('January');
    expect(element.textContent).toContain('Selected duration: 12 months');
  });
});
