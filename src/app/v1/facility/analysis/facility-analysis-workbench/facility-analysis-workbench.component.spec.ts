import { analysisNavigationRequirement } from './facility-analysis-workbench.component';

describe('facility analysis workbench navigation', () => {
  it('explains each condition that disables the wizard action', () => {
    expect(analysisNavigationRequirement('saving', false, true)).toBe('Saving changes before navigation is available.');
    expect(analysisNavigationRequirement('invalid', false, true)).toBe('Fix the validation errors before continuing.');
    expect(analysisNavigationRequirement('error', false, true)).toBe('Retry or discard the unsaved changes before continuing.');
    expect(analysisNavigationRequirement('saved', true, true)).toBe('Resolve the errors in this stage before continuing.');
  });

  it('allows navigation when the stage is ready and lets Finish ignore earlier-stage findings', () => {
    expect(analysisNavigationRequirement('saved', false, true)).toBeUndefined();
    expect(analysisNavigationRequirement('idle', true, false)).toBeUndefined();
  });
});
