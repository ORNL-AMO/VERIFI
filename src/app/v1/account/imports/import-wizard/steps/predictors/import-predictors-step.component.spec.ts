import { ImportPredictorsStepComponent } from './import-predictors-step.component';
import { createImportWizardStateStub, renderImportStep } from '../import-step.test-support';

describe('ImportPredictorsStepComponent', () => {
  it('shows the predictor review fields and existing status', () => {
    const { fixture } = renderImportStep(ImportPredictorsStepComponent);
    const text = fixture.nativeElement.textContent;

    ['Facility', 'Predictor', 'Type', 'Units', 'Production', 'Is valid?', 'New / Existing', 'Include']
      .forEach(label => expect(text).toContain(label));
    expect(text).toContain('Main Plant');
    expect(text).toContain('Standard');
    expect(text).toContain('Existing');
    expect(text).toContain('Valid');
  });

  it('uses the bulk and row controls for predictor decisions', () => {
    const state = createImportWizardStateStub();
    const { fixture } = renderImportStep(ImportPredictorsStepComponent, state);
    const element = fixture.nativeElement as HTMLElement;
    const checkboxes = element.querySelectorAll<HTMLInputElement>('.predictor-review-checkbox');

    checkboxes[0].checked = false;
    checkboxes[0].dispatchEvent(new Event('change'));
    checkboxes[1].click();
    checkboxes[2].click();

    expect(state.setAllPredictorsIncluded).toHaveBeenCalledWith(false);
    expect(state.setPredictorProduction).toHaveBeenCalled();
    expect(state.togglePredictorIncluded).toHaveBeenCalled();
  });

  it('opens the editor with the matching explanation and cancels without committing', () => {
    const state = createImportWizardStateStub();
    state.draft().predictors[0].id = undefined;
    const { fixture } = renderImportStep(ImportPredictorsStepComponent, state);
    const element = fixture.nativeElement as HTMLElement;

    element.querySelector<HTMLButtonElement>('.predictor-review-name')!.click();
    fixture.detectChanges();

    expect(element.textContent).toContain('Match this upload to an existing predictor');
    expect(element.textContent).toContain('Spreadsheet predictors are created as Standard predictors');
    const tooltip = element.querySelector<HTMLElement>('.import-predictor-editor__existing app-ui-tooltip');
    expect(tooltip?.querySelector('button')?.getAttribute('aria-label')).toBe('Why match an existing predictor?');
    expect(tooltip?.textContent).toContain('different or mistyped name');
    expect(element.querySelector<HTMLSelectElement>('.import-predictor-editor__existing select')?.classList.contains('v1-select')).toBe(true);

    element.querySelector<HTMLButtonElement>('.import-predictor-editor__actions .v1-btn--secondary')!.click();
    fixture.detectChanges();
    expect(state.savePredictor).not.toHaveBeenCalled();
  });

  it('maps a new import to an existing Weather predictor on Save', () => {
    const state = createImportWizardStateStub();
    const original = state.draft().predictors[0];
    original.id = undefined;
    const weather = {
      ...structuredClone(original),
      id: 7,
      guid: 'weather-a',
      name: 'HDD 60',
      unit: 'days',
      predictorType: 'Weather',
      weatherDataType: 'HDD',
      weatherStationId: 'KORD',
      weatherStationName: 'Chicago O’Hare',
      heatingBaseTemperature: 60
    };
    state.availableExistingPredictors.mockReturnValue([weather]);
    const { fixture } = renderImportStep(ImportPredictorsStepComponent, state);
    const element = fixture.nativeElement as HTMLElement;

    element.querySelector<HTMLButtonElement>('.predictor-review-name')!.click();
    fixture.detectChanges();
    const select = element.querySelector<HTMLSelectElement>('.import-predictor-editor__existing select')!;
    select.value = weather.guid;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(element.textContent).toContain('Weather-station setup');
    expect(element.textContent).toContain('manual overrides');
    element.querySelector<HTMLButtonElement>('.import-predictor-editor__actions .v1-btn--action')!.click();

    expect(state.savePredictor).toHaveBeenCalledWith(
      original.guid,
      expect.objectContaining({
        id: weather.id,
        guid: weather.guid,
        importWizardName: original.importWizardName
      })
    );
  });

  it('blocks saving an invalid Standard predictor', () => {
    const state = createImportWizardStateStub();
    state.draft().predictors[0].id = undefined;
    state.draft().predictors[0].name = '';
    const { fixture } = renderImportStep(ImportPredictorsStepComponent, state);
    const element = fixture.nativeElement as HTMLElement;

    element.querySelector<HTMLButtonElement>('.predictor-review-name')!.click();
    fixture.detectChanges();
    element.querySelector<HTMLButtonElement>('.import-predictor-editor__actions .v1-btn--action')!.click();
    fixture.detectChanges();

    expect(state.savePredictor).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Resolve validation issues before saving this predictor.');
  });
});
