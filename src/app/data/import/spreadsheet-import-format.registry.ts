import { ImportFileKind, ImportWorkflowKind, TemplateVersion } from './spreadsheet-import.models';

export interface ImportFormatDefinition {
  readonly kind: ImportFileKind;
  readonly label: string;
  readonly workflow: ImportWorkflowKind;
}

const FORMAT_BY_VERSION: Record<TemplateVersion, Exclude<ImportFileKind, 'energy-uses-template'>> = {
  V1: 'verifi-v1',
  V2: 'verifi-v2',
  V3: 'verifi-v3',
  ETH: 'energy-treasure-hunt',
  'Non-template': 'general-workbook',
  'Footprint-tool': 'footprint-tool'
};

const FORMATS: Record<ImportFileKind, ImportFormatDefinition> = {
  'verifi-v1': { kind: 'verifi-v1', label: 'VERIFI Template', workflow: 'template' },
  'verifi-v2': { kind: 'verifi-v2', label: 'VERIFI Template', workflow: 'template' },
  'verifi-v3': { kind: 'verifi-v3', label: 'VERIFI Template', workflow: 'template' },
  'energy-treasure-hunt': {
    kind: 'energy-treasure-hunt',
    label: 'Energy Treasure Hunt',
    workflow: 'template'
  },
  'general-workbook': {
    kind: 'general-workbook',
    label: 'Spread Sheet Columns',
    workflow: 'general-workbook'
  },
  'energy-uses-template': { kind: 'energy-uses-template', label: 'Energy Uses Template', workflow: 'energy-uses' },
  'footprint-tool': { kind: 'footprint-tool', label: 'Energy Footprint Tool', workflow: 'footprint' }
};

export function importKindForTemplateVersion(version: TemplateVersion): Exclude<ImportFileKind, 'energy-uses-template'> {
  return FORMAT_BY_VERSION[version];
}

export function importFormat(kind: ImportFileKind): ImportFormatDefinition {
  return FORMATS[kind];
}

export function importWorkflowForKind(kind: ImportFileKind): ImportWorkflowKind {
  return importFormat(kind).workflow;
}
