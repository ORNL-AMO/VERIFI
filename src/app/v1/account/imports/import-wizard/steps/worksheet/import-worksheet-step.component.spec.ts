import { ImportWorksheetStepComponent } from './import-worksheet-step.component';
import { renderImportStep } from '../import-step.test-support';

describe('ImportWorksheetStepComponent', () => {
  it('shows the selected worksheet preview and row count', () => {
    const { fixture, state } = renderImportStep(ImportWorksheetStepComponent);

    expect(fixture.nativeElement.textContent).toContain('1 data rows found');
    expect(fixture.nativeElement.textContent).toContain('Electricity');
    const selects = fixture.nativeElement.querySelectorAll('select');
    expect(selects.length).toBe(2);
    expect([...selects].every((select: HTMLSelectElement) => select.classList.contains('v1-select'))).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Multiple facilities');

    selects[1].value = 'facility-1';
    selects[1].dispatchEvent(new Event('change'));

    expect(state.setGeneralWorkbookFacility).toHaveBeenCalledWith('facility-1');
  });
});
