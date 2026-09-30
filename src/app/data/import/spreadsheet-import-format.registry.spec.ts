import {
  importFormat,
  importKindForTemplateVersion,
  importWorkflowForKind
} from './spreadsheet-import-format.registry';

describe('spreadsheet import format registry', () => {
  it('maps every parser version to its source format', () => {
    expect(importKindForTemplateVersion('V1')).toBe('verifi-v1');
    expect(importKindForTemplateVersion('V2')).toBe('verifi-v2');
    expect(importKindForTemplateVersion('V3')).toBe('verifi-v3');
    expect(importKindForTemplateVersion('ETH')).toBe('energy-treasure-hunt');
    expect(importKindForTemplateVersion('Non-template')).toBe('general-workbook');
    expect(importKindForTemplateVersion('Footprint-tool')).toBe('footprint-tool');
  });

  it('separates source format labels from shared workflow kinds', () => {
    expect(importFormat('energy-treasure-hunt').label).toBe('Energy Treasure Hunt');
    expect(importWorkflowForKind('energy-treasure-hunt')).toBe('template');
    expect(importWorkflowForKind('general-workbook')).toBe('general-workbook');
    expect(importWorkflowForKind('footprint-tool')).toBe('footprint');
  });
});
