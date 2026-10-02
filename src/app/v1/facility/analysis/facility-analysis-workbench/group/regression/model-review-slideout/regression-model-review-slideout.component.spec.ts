import { TestBed } from '@angular/core/testing';
import { AnalysisGroup, JStatRegressionModel } from '@data/models/analysis';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { RegressionModelReviewSlideoutComponent } from './regression-model-review-slideout.component';

describe('RegressionModelReviewSlideoutComponent', () => {
  it('shows candidate details and supports selection from the shared slideout', async () => {
    await TestBed.configureTestingModule({ imports: [RegressionModelReviewSlideoutComponent] }).compileComponents();
    const fixture = TestBed.createComponent(RegressionModelReviewSlideoutComponent);
    const model = {
      modelId: 'candidate', modelYear: 2024, coef: [1.234567, 2.345678], R2: .9123456, adjust_R2: .88123456, modelPValue: .01234567,
      predictorVariables: [{ id: 'production', name: 'Production' }], t: { p: [0, .02] },
      isValid: true, SEPValidationPass: true, modelNotes: [], dataValidationNotes: [], modelValidationNotes: []
    } as JStatRegressionModel;
    fixture.componentRef.setInput('model', model);
    fixture.componentRef.setInput('group', {
      selectedModelId: 'current', predictorVariables: [{ id: 'production', name: 'Production' }]
    } as AnalysisGroup);
    fixture.componentRef.setInput('currentModel', { ...model, modelId: 'current', modelYear: 2023 });
    fixture.componentRef.setInput('analysis', { analysisCategory: 'energy', energyUnit: 'MMBtu' } as IdbAnalysisItem);
    fixture.componentRef.setInput('validationState', { state: 'loading', source: 'generated' });
    fixture.detectChanges();

    const selected = vi.fn();
    fixture.componentInstance.selected.subscribe(selected);
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('app-workspace-slideout')).not.toBeNull();
    expect(element.textContent).toContain('Modeled Energy');
    expect(element.textContent).toContain('1.2346 + (2.3457 × Production)');
    expect(element.textContent).toContain('0.91235');
    expect(element.textContent).toContain('Candidate model');
    expect(element.querySelector('.v1-regression-review__stats')).toBeNull();
    expect(element.querySelector('.v1-regression-review__comparison')?.textContent).toContain('Model year');
    expect(element.querySelector('.v1-regression-review__comparison')?.textContent).toContain('2023');
    [...element.querySelectorAll<HTMLButtonElement>('button')]
      .find(button => button.textContent?.includes('Select this model'))?.click();
    expect(selected).toHaveBeenCalledWith(model);
  });
});
