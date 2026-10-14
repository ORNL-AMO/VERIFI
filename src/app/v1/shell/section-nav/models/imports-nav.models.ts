import type { ImportFileDraft } from '@data/import/spreadsheet-import.models';
import { ImportStepDefinition, stepsForDraft } from '@app/v1/account/imports/import-workflow.config';
export type ImportNavigationFile = {
  readonly id: string;
  readonly name: string;
  readonly steps: ReadonlyArray<ImportStepDefinition>;
  readonly completedSteps: readonly string[];
  readonly currentStep: string;
  readonly active: boolean;
  readonly disabled: boolean;
};

export function buildImportNavigationFiles(
  drafts: readonly ImportFileDraft[], activeFileId: string | undefined, activeStep: string | undefined, navigationBlocked: boolean
): readonly ImportNavigationFile[] {
  return drafts.map(draft => {
    const steps = stepsForDraft(draft);
    const completedSteps = draft.status === 'completed'
      ? steps.map(step => step.id)
      : [...draft.completedSteps];
    const nextStep = steps.find(step => !completedSteps.includes(step.id)) ?? steps[steps.length - 1];
    const active = draft.id === activeFileId;
    const currentStep = active && steps.some(step => step.id === activeStep)
      ? activeStep!
      : nextStep?.id ?? '';
    return {
      id: draft.id,
      name: draft.name,
      steps,
      completedSteps,
      currentStep,
      active,
      disabled: navigationBlocked || draft.status === 'invalid' || draft.status === 'importing'
    };
  });
}
