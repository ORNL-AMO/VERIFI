import { TestBed } from '@angular/core/testing';
import { AnalysisGroup } from '@data/models/analysis';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { UserDefinedRegressionWorkflowComponent } from './user-defined-regression-workflow.component';

describe('UserDefinedRegressionWorkflowComponent', () => {
  it('renders the equation and explicit model period without generated-model settings', async () => {
    await TestBed.configureTestingModule({ imports: [UserDefinedRegressionWorkflowComponent] }).compileComponents();
    const fixture = TestBed.createComponent(UserDefinedRegressionWorkflowComponent);
    fixture.componentRef.setInput('group', {
      isGeneratedModel: false,
      regressionConstant: 2,
      regressionModelStartMonth: 0,
      regressionStartYear: 2024,
      regressionModelEndMonth: 11,
      regressionEndYear: 2024,
      predictorVariables: [{ id: 'production', name: 'Production', productionInAnalysis: true, regressionCoefficient: 3 }]
    } as AnalysisGroup);
    fixture.componentRef.setInput('analysis', { analysisCategory: 'energy', energyUnit: 'MMBtu' } as IdbAnalysisItem);
    fixture.componentRef.setInput('months', [{ name: 'January', monthNumValue: 0 }, { name: 'December', monthNumValue: 11 }]);
    fixture.componentRef.setInput('yearOptions', [2024]);
    fixture.componentRef.setInput('validationState', { state: 'idle', source: 'user-defined' });
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('#regression-constant')).not.toBeNull();
    expect(element.querySelector('.v1-user-regression__variables #regression-constant')).not.toBeNull();
    expect(element.querySelector('.v1-user-regression__equation')?.textContent).toContain('Modeled Energy');
    expect(element.querySelector('.v1-user-regression__equation')?.textContent).toContain('2 + (3 × Production)');
    expect(element.querySelector('#model-start-month')).not.toBeNull();
    expect(element.querySelector('#user-model-year')).toBeNull();
    expect(element.querySelector('#maximum-model-variables')).toBeNull();
    expect(element.textContent).toContain('Selected duration: 12 months');
    expect((element.querySelector('#model-start-month') as HTMLSelectElement).value).toBe('0');
    expect((element.querySelector('#model-start-year') as HTMLSelectElement).value).toBe('2024');
    expect((element.querySelector('#model-end-month') as HTMLSelectElement).value).toBe('11');
    expect((element.querySelector('#model-end-year') as HTMLSelectElement).value).toBe('2024');
  });
});
