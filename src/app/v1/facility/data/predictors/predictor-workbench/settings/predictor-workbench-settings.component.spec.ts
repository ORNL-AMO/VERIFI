import { TestBed } from '@angular/core/testing';
import { PredictorWorkbenchSettingsComponent } from './predictor-workbench-settings.component';

describe('PredictorWorkbenchSettingsComponent', () => {
  it('explains the read-only settings phase without inactive controls', () => {
    TestBed.configureTestingModule({ imports: [PredictorWorkbenchSettingsComponent] });
    const fixture = TestBed.createComponent(PredictorWorkbenchSettingsComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Settings are read-only');
    expect(fixture.nativeElement.querySelector('button, input, select')).toBeNull();
  });
});
