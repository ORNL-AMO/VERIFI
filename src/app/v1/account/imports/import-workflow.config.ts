import { ImportFileDraft } from '@data/import/spreadsheet-import.models';
import { importWorkflowForKind } from '@data/import/spreadsheet-import-format.registry';

export interface ImportStepDefinition {
  readonly id: string;
  readonly label: string;
  readonly help: string;
}

const TEMPLATE_STEPS: ImportStepDefinition[] = [
  { id: 'facilities', label: 'Facilities', help: 'Confirm the facilities found in this workbook.' },
  { id: 'meters', label: 'Meters', help: 'Review meter setup and decide which meters to include.' },
  { id: 'meter-readings', label: 'Meter readings', help: 'Review dates, values, and overwrite choices.' },
  { id: 'predictors', label: 'Predictors', help: 'Review predictor setup and production choices.' },
  { id: 'predictor-readings', label: 'Predictor readings', help: 'Review predictor values and overwrite choices.' },
  { id: 'review', label: 'Review', help: 'Confirm the complete upload before saving.' }
];

const GENERAL_STEPS: ImportStepDefinition[] = [
  { id: 'worksheet', label: 'Worksheet', help: 'Choose the worksheet containing the data to upload.' },
  { id: 'columns', label: 'Identify columns', help: 'Identify one date column and all meter or predictor columns.' },
  { id: 'map-meters', label: 'Map meters', help: 'Assign every included meter column to a facility.' },
  { id: 'meters', label: 'Review meters', help: 'Review detected meter names, sources, and units.' },
  { id: 'meter-readings', label: 'Meter readings', help: 'Review parsed meter readings and exclusions.' },
  { id: 'map-predictors', label: 'Map predictors', help: 'Assign every included predictor column to a facility.' },
  { id: 'predictors', label: 'Review predictors', help: 'Review predictor names and production choices.' },
  { id: 'predictor-readings', label: 'Predictor readings', help: 'Review parsed predictor readings.' },
  { id: 'review', label: 'Review', help: 'Confirm the complete upload before saving.' }
];

const FOOTPRINT_STEPS: ImportStepDefinition[] = [
  { id: 'facility', label: 'Select facility', help: 'Choose the facility that owns these energy uses.' },
  { id: 'equipment', label: 'Map equipment', help: 'Review equipment and meter-group links.' },
  { id: 'review', label: 'Review', help: 'Confirm the energy-use upload before saving.' }
];

export function stepsForDraft(draft: ImportFileDraft): ImportStepDefinition[] {
  const workflow = importWorkflowForKind(draft.kind);
  if (workflow === 'general-workbook') return GENERAL_STEPS;
  if (workflow === 'footprint') return FOOTPRINT_STEPS;
  return TEMPLATE_STEPS;
}
