import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnalysisGroup, JStatRegressionModel } from '@data/models/analysis';
import { FacilityAnalysisRegressionController } from '../facility-analysis-regression.controller';
import { FacilityAnalysisRegressionFacade } from '../facility-analysis-regression.facade';
import { GeneratedRegressionWorkflowComponent } from './generated-regression-workflow.component';

describe('GeneratedRegressionWorkflowComponent', () => {
  const baseGroup = {
    isGeneratedModel: true, maxModelVariables: 1,
    predictorVariables: [
      { id: 'production', name: 'Production', productionInAnalysis: true },
      { id: 'weather', name: 'Weather', productionInAnalysis: false }
    ]
  } as AnalysisGroup;
  let group: ReturnType<typeof signal<AnalysisGroup | undefined>>;
  let models: ReturnType<typeof signal<readonly JStatRegressionModel[]>>;
  let facade: Record<string, any>;

  beforeEach(async () => {
    group = signal<AnalysisGroup | undefined>(structuredClone(baseGroup));
    models = signal<readonly JStatRegressionModel[]>([]);
    facade = {
      group, analysis: signal({ analysisCategory: 'energy' }), generatedModels: models, generating: signal(false), generationError: signal(undefined),
      configurationExpanded: signal(true), generatedThisSession: signal(false), maxVariableOptions: signal([1]),
      setPredictorSelected: vi.fn(), changeMaxVariables: vi.fn(), setConstant: vi.fn(), setRange: vi.fn(),
      setNotes: vi.fn(), setCoefficient: vi.fn(), changeMethod: vi.fn(), inspectModel: vi.fn(), clearReview: vi.fn(),
      selectModel: vi.fn(), generateModels: vi.fn()
    };
    await TestBed.configureTestingModule({
      imports: [GeneratedRegressionWorkflowComponent],
      providers: [{ provide: FacilityAnalysisRegressionFacade, useValue: facade }, FacilityAnalysisRegressionController]
    }).compileComponents();
  });

  function create(): ComponentFixture<GeneratedRegressionWorkflowComponent> {
    const fixture = TestBed.createComponent(GeneratedRegressionWorkflowComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('shows only predictor and maximum-variable generation settings', () => {
    const element = create().nativeElement as HTMLElement;
    expect(element.querySelector('#maximum-model-variables')).not.toBeNull();
    expect(element.querySelector('#model-start-month')).toBeNull();
    expect(button(element, 'Generate models').disabled).toBe(false);
    expect(facade.setPredictorSelected).not.toHaveBeenCalled();
    expect(facade.changeMaxVariables).not.toHaveBeenCalled();
  });

  it('sends one typed predictor change after hydration', () => {
    const fixture = create();
    const predictors = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLInputElement>('.v1-generated-regression__predictor-list input');
    predictors[1].click();
    fixture.detectChanges();
    expect(facade.setPredictorSelected).toHaveBeenCalledOnce();
    expect(facade.setPredictorSelected).toHaveBeenCalledWith('weather', true);
  });

  it('collapses generation settings into a summary above generated models', () => {
    group.set({ ...baseGroup, selectedModelId: 'model-a', models: [model(2024)] });
    models.set([model(2024)]);
    facade.configurationExpanded.set(false);
    const element = create().nativeElement as HTMLElement;
    expect(element.textContent).toContain('Production · maximum 1 variable');
    expect(button(element, 'Edit settings')).toBeTruthy();
    expect(element.querySelector('table')).not.toBeNull();
    expect(element.textContent).toContain('1 + (2 × Production)');
  });

  it('filters generated models by model year', () => {
    models.set([model(2023), model(2024)]);
    const fixture = create();
    const select = fixture.nativeElement.querySelector('#model-year-filter') as HTMLSelectElement;
    select.selectedIndex = 1;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).querySelector('tbody')?.textContent ?? '';
    expect(text).toContain(select.selectedOptions[0].textContent);
  });

  it('includes models with issues through reactive filter controls', () => {
    models.set([{ ...model(2024), isValid: false, SEPValidationPass: false,
      modelValidationNotes: ['Critical issue'], dataValidationNotes: ['Validation issue'] }]);
    const fixture = create();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('tbody')).toBeNull();
    [...element.querySelectorAll<HTMLInputElement>('.v1-generated-regression__issue-filters input')].forEach(filter => filter.click());
    fixture.detectChanges();
    expect(element.textContent).toContain('Critical issue');
    expect(element.textContent).toContain('Validation issue');
  });

  it('uses the analysis category in the modeled equation heading', () => {
    facade.analysis.set({ analysisCategory: 'water' });
    models.set([model(2024)]);

    expect((create().nativeElement as HTMLElement).textContent).toContain('Predictors and Modeled Water Equation');
  });

  function model(year: number): JStatRegressionModel {
    return {
      modelId: `model-${year}`, modelYear: year, coef: [1, 2], predictorVariables: [baseGroup.predictorVariables[0]],
      isValid: true, SEPValidationPass: true, modelNotes: [], dataValidationNotes: [], modelValidationNotes: []
    } as JStatRegressionModel;
  }
});

function button(element: HTMLElement, text: string): HTMLButtonElement {
  return [...element.querySelectorAll<HTMLButtonElement>('button')].find(item => item.textContent?.includes(text))!;
}
