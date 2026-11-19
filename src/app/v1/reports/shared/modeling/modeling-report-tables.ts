import { formatNumber } from '@angular/common';
import { ModelingReportView } from '@domain/reports/modeling-report';
import { AnalysisResultNumberPipe } from '@app/v1/shared/analysis-results/number/analysis-result-number.pipe';
import { analysisModelDetails } from '../analysis-checks/analysis-model.view';

type ModelingGroup = ModelingReportView['regression'][number];
const number = new AnalysisResultNumberPipe();

/** The preview and file composer use the same precision and missing-value rules. */
export function modelingModelDetails(item: ModelingGroup) {
  const statistic = (value: number | undefined, digits: string) => item.model && !item.model.isUserDefinedModel
    && value != null && Number.isFinite(value) ? formatNumber(value, 'en-US', digits) : '—';
  return { ...analysisModelDetails(item),
    r2: statistic(item.model?.R2, '1.3-3'),
    adjustedR2: statistic(item.model?.adjust_R2, '1.3-3'),
    modelPValue: statistic(item.model?.modelPValue, '1.2-2')
  };
}

export const MODELING_REGRESSION_HEADERS = ['Facility', 'Group', 'Model period', 'Variable p-values',
  'R²', 'Adjusted R²', 'Model p-value', 'Formula', 'Minor issues'];
export const MODELING_DETAILS_HEADERS = MODELING_REGRESSION_HEADERS.filter(header => header !== 'Formula');

export function modelingDetailsCells(item: ModelingGroup, scope: ModelingReportView['scope'] = 'account'): string[] {
  const cells = modelingRegressionCells(item).filter((_cell, index) => index !== 7);
  if (scope === 'account') return cells;
  const details = cells.slice(2);
  details[0] += item.model?.isUserDefinedModel ? '\nUser defined' : !item.model ? '\nModel unavailable' : '';
  return details;
}

export function modelingGroupTitle(view: ModelingReportView, item: ModelingGroup): string {
  return view.scope === 'facility' ? item.groupName : `${item.facilityName} · ${item.groupName}`;
}

export function modelingRegressionCells(item: ModelingGroup): string[] {
  const details = modelingModelDetails(item), model = item.model;
  return [item.facilityName, item.groupName + (model?.isUserDefinedModel ? '\nUser defined' : !model ? '\nModel unavailable' : ''),
    details.modelPeriod,
    model && !model.isUserDefinedModel && details.variablePValues.length
      ? details.variablePValues.map(variable => `${variable.name}: ${variable.value}`).join('\n') : '—',
    details.r2, details.adjustedR2, details.modelPValue, details.formula, item.minor.join('\n') || '—'];
}

export function modelingValidationRows(item: ModelingGroup): string[][] {
  return [...modelingModelDetails(item).validation.map(metric => [metric.label,
    ...metric.cells.map(cell => number.transform(cell.value) + (cell.failed ? ' — Fail' : ''))]),
    ['Validation check', ...(item.model?.SEPValidation ?? []).map(validation => validation.isValid ? 'Pass' : 'Fail')]];
}
