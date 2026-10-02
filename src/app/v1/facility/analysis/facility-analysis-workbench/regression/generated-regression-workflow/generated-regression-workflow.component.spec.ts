import { TestBed } from '@angular/core/testing';
import { AnalysisGroup, JStatRegressionModel } from '@data/models/analysis';
import { GeneratedRegressionWorkflowComponent } from './generated-regression-workflow.component';

describe('GeneratedRegressionWorkflowComponent', () => {
  const group = {
    isGeneratedModel: true,
    maxModelVariables: 1,
    predictorVariables: [
      { id: 'production', name: 'Production', productionInAnalysis: true },
      { id: 'weather', name: 'Weather', productionInAnalysis: false }
    ]
  } as AnalysisGroup;

  it('shows only predictor and maximum-variable generation settings', async () => {
    await TestBed.configureTestingModule({ imports: [GeneratedRegressionWorkflowComponent] }).compileComponents();
    const fixture = TestBed.createComponent(GeneratedRegressionWorkflowComponent);
    fixture.componentRef.setInput('group', group);
    fixture.componentRef.setInput('models', []);
    fixture.componentRef.setInput('maxVariableOptions', [1]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('#maximum-model-variables')).not.toBeNull();
    expect(element.querySelector('#model-start-month')).toBeNull();
    expect(button(element, 'Generate models').disabled).toBe(false);
  });

  it('collapses generation settings into a summary above generated models', async () => {
    await TestBed.configureTestingModule({ imports: [GeneratedRegressionWorkflowComponent] }).compileComponents();
    const fixture = TestBed.createComponent(GeneratedRegressionWorkflowComponent);
    fixture.componentRef.setInput('group', { ...group, selectedModelId: 'model-a', models: [{ modelId: 'model-a' }] });
    fixture.componentRef.setInput('models', [{
      modelId: 'model-a', modelYear: 2024, coef: [1, 2], predictorVariables: [group.predictorVariables[0]],
      isValid: true, SEPValidationPass: true, modelNotes: [], dataValidationNotes: [], modelValidationNotes: []
    } as JStatRegressionModel]);
    fixture.componentRef.setInput('maxVariableOptions', [1]);
    fixture.componentRef.setInput('configurationExpanded', false);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Production · maximum 1 variable');
    expect(button(element, 'Edit settings')).toBeTruthy();
    expect(element.querySelector('table')).not.toBeNull();
    expect(element.textContent).toContain('1 + (2 × Production)');
    expect(element.querySelector('th[aria-sort="descending"]')?.textContent).toContain('Adjusted R²');
  });

  it('filters generated models by model year', async () => {
    await TestBed.configureTestingModule({ imports: [GeneratedRegressionWorkflowComponent] }).compileComponents();
    const fixture = TestBed.createComponent(GeneratedRegressionWorkflowComponent);
    const models = [2023, 2024].map(year => ({
      modelId: `model-${year}`, modelYear: year, coef: [1, 2], predictorVariables: [group.predictorVariables[0]],
      isValid: true, SEPValidationPass: true, modelNotes: [], dataValidationNotes: [], modelValidationNotes: []
    } as JStatRegressionModel));
    fixture.componentRef.setInput('group', group);
    fixture.componentRef.setInput('models', models);
    fixture.componentRef.setInput('maxVariableOptions', [1]);
    fixture.detectChanges();

    const select = fixture.nativeElement.querySelector('#model-year-filter') as HTMLSelectElement;
    select.value = '2024';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).querySelector('tbody')?.textContent ?? '';
    expect(text).toContain('2024');
    expect(text).not.toContain('2023');
  });

  it('includes models with issues and shows their findings in optional columns', async () => {
    await TestBed.configureTestingModule({ imports: [GeneratedRegressionWorkflowComponent] }).compileComponents();
    const fixture = TestBed.createComponent(GeneratedRegressionWorkflowComponent);
    fixture.componentRef.setInput('group', group);
    fixture.componentRef.setInput('models', [{
      modelId: 'model-review', modelYear: 2024, coef: [1, 2], predictorVariables: [group.predictorVariables[0]],
      isValid: false, SEPValidationPass: false, modelNotes: [],
      modelValidationNotes: ['The model p-value exceeds the allowed limit.'],
      dataValidationNotes: ['Production is outside the modeled range.']
    } as JStatRegressionModel]);
    fixture.componentRef.setInput('maxVariableOptions', [1]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('tbody')).toBeNull();

    const issueFilters = [...element.querySelectorAll<HTMLInputElement>('.v1-generated-regression__issue-filters input')];
    issueFilters.forEach(filter => filter.click());
    fixture.detectChanges();

    expect(element.textContent).toContain('Show models with critical issues');
    expect(element.textContent).toContain('Show models with validation issues');
    expect(element.textContent).toContain('Critical issues');
    expect(element.textContent).toContain('Validation issues');
    expect(element.textContent).toContain('The model p-value exceeds the allowed limit.');
    expect(element.textContent).toContain('Production is outside the modeled range.');
  });
});

function button(element: HTMLElement, text: string): HTMLButtonElement {
  return [...element.querySelectorAll<HTMLButtonElement>('button')].find(item => item.textContent?.includes(text))!;
}
