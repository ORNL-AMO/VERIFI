import { ModelingReportView } from './modeling-report';

export interface ModelingReportWorkbook {
  readonly headers: readonly string[];
  readonly rows: readonly (readonly (string | number)[])[];
}

const MISSING = '—';
const finite = (value: number | undefined): number | string => value != null && Number.isFinite(value) ? value : MISSING;
const notes = (values: readonly string[]): string => values.length ? values.join('; ') : MISSING;

/** Preserve the legacy Executive Summary sheet/column contract using detached current report results. */
export function modelingReportWorkbook(view: ModelingReportView): ModelingReportWorkbook {
  const maxPredictors = view.regression.reduce((max, group) => Math.max(max, group.model?.predictorVariables?.length ?? 0), 0);
  const headers = ['Facility', 'Group', 'Baseline Year', 'Model Year', 'R2', 'Adjusted R2', 'Model P-Value',
    'Model Equation', 'Minor Issues', 'Critical Issues', 'Moderate Issues', 'Constant'];
  for (let index = 1; index <= maxPredictors; index++) headers.push(`Coefficient ${index} Name`, `Coefficient ${index} Value`, `Coefficient ${index} p-Value`);
  const rows: (string | number)[][] = view.regression.map(group => {
    const model = group.model;
    // User-defined models have no fitted-model statistics, matching the v1 preview.
    const fitted = model && !model.isUserDefinedModel ? model : undefined;
    const equation = model?.coef?.map((value, index) => {
      const text = Number.isFinite(value) ? value.toLocaleString(undefined, { maximumSignificantDigits: 3, minimumSignificantDigits: 3 }) : MISSING;
      return index === 0 ? text : `(${text}*${model.predictorVariables[index - 1]?.name ?? 'Unknown predictor'})`;
    }).join(' + ') || MISSING;
    const row: (string | number)[] = [group.facilityName, group.groupName, finite(group.baselineYear),
      finite(group.group.regressionModelYear ?? model?.modelYear), finite(fitted?.R2), finite(fitted?.adjust_R2), finite(fitted?.modelPValue),
      equation, notes(group.minor), notes(group.critical), notes(group.moderate), finite(model?.coef?.[0])];
    for (let index = 0; index < maxPredictors; index++) row.push(model?.predictorVariables?.[index]?.name ?? MISSING,
      finite(model?.coef?.[index + 1]), finite(fitted?.t?.p?.[index + 1]));
    return row;
  });
  for (const method of view.methods) for (const group of method.groups) {
    const predictors = method.method !== 'absoluteEnergyConsumption';
    rows.push([group.facilityName, group.groupName, finite(group.baselineYear), MISSING, MISSING, MISSING, MISSING,
      predictors && group.predictors.length ? group.predictors.join('; ') + '; ' : MISSING,
      method.method === 'absoluteEnergyConsumption' ? 'Absolute' : method.label,
      MISSING, MISSING, MISSING, ...Array<string>(maxPredictors * 3).fill(MISSING)]);
  }
  return { headers, rows };
}
