import { ImportReviewStepComponent } from './import-review-step.component';
import { createImportWizardStateStub, renderImportStep } from '../import-step.test-support';

describe('ImportReviewStepComponent', () => {
  it('renders nonzero totals and named records in a facility card without a summary table', () => {
    const { fixture } = renderImportStep(ImportReviewStepComponent);
    const element: HTMLElement = fixture.nativeElement;
    const card = element.querySelector('[role="listitem"]');

    expect(element.querySelector('table')).toBeNull();
    expect(element.querySelector('[aria-label="Upload totals"]')?.textContent).toContain('Facilities affected');
    expect(card?.textContent).toContain('Main Plant');
    expect(card?.textContent).toContain('Electricity');
    expect(card?.textContent).toContain('kWh');
    expect(card?.textContent).toContain('Production');
    expect(card?.textContent).toContain('Standard');
    expect(card?.textContent).not.toContain('0 new readings');
  });

  it('shows compact notices for kept-current and excluded readings', () => {
    const state = createImportWizardStateStub();
    const draft = state.draft();
    const meterOverlap = structuredClone(draft.meterData[0]);
    const invalidMeterReading = {
      ...structuredClone(meterOverlap),
      guid: 'invalid-meter-reading',
      year: 1900
    };
    const predictorOverlap = structuredClone(draft.predictorData[0]);
    const invalidPredictorReading = {
      ...structuredClone(predictorOverlap),
      guid: 'invalid-predictor-reading',
      month: 13
    };
    state.workspace.meterData.set([{ ...structuredClone(meterOverlap), guid: 'current-meter-reading' }]);
    state.workspace.predictorData.set([{ ...structuredClone(predictorOverlap), guid: 'current-predictor-reading' }]);
    state.draft.update((value: any) => ({
      ...value,
      meterData: [meterOverlap, invalidMeterReading],
      predictorData: [predictorOverlap, invalidPredictorReading],
      skipExistingReadingsMeterIds: [value.meters[0].guid],
      skipExistingPredictorIds: [value.predictors[0].guid],
      excludedMeterReadingIds: [invalidMeterReading.guid],
      excludedPredictorReadingIds: [`${invalidPredictorReading.guid}:1`]
    }));

    const { fixture } = renderImportStep(ImportReviewStepComponent, state);
    const notices = fixture.nativeElement.querySelector('.import-review-omissions')?.textContent;

    expect(notices).toContain('1 current meter reading kept');
    expect(notices).toContain('1 invalid meter reading excluded');
    expect(notices).toContain('1 current predictor reading kept');
    expect(notices).toContain('1 invalid predictor reading excluded');
  });

  it('shows the selected footprint facility and its energy-use hierarchy', () => {
    const state = createImportWizardStateStub();
    state.draft.update((draft: any) => ({
      ...draft,
      kind: 'footprint-tool',
      selectedFacilityId: draft.importFacilities[0].guid,
      meters: [],
      meterData: [],
      predictors: [],
      predictorData: []
    }));

    const { fixture } = renderImportStep(ImportReviewStepComponent, state);
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Upload destination');
    expect(text).toContain('Process heating');
    expect(text).toContain('Boiler');
  });

  it('renders an accessible empty state when a general workbook has no included records', () => {
    const state = createImportWizardStateStub();
    state.draft.update((draft: any) => ({
      ...draft,
      kind: 'general-workbook',
      meters: [],
      meterData: [],
      predictors: [],
      predictorData: [],
      facilityEnergyUseGroups: [],
      facilityEnergyUseEquipment: []
    }));

    const { fixture } = renderImportStep(ImportReviewStepComponent, state);
    const status = fixture.nativeElement.querySelector('[role="status"]');

    expect(status?.textContent).toContain('Nothing is selected to upload');
    expect(fixture.nativeElement.querySelector('[aria-label="Upload summary by facility"]')).toBeNull();
  });
});
