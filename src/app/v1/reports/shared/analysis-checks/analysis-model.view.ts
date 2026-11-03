import { AnalysisDataCheckGroup } from '@domain/reports/analysis-data-checks';

export function analysisModelDetails(item: AnalysisDataCheckGroup) {
  return {
formula: item.model?.coef?.map((coefficient, index) => index === 0 ? significant(coefficient)
      : `(${significant(coefficient)} × ${item.model!.predictorVariables[index - 1]?.name ?? 'Unknown predictor'})`).join(' + ') ?? '—',
    variablePValues: item.model?.predictorVariables?.map((variable, index) => ({ name: variable.name, value: item.model!.t?.p?.[index + 1]?.toFixed(2) ?? '—' })) ?? [],
    modelPeriod: item.model?.isUserDefinedModel
      ? `${item.group.regressionModelStartMonth + 1}/${item.group.regressionStartYear} – ${item.group.regressionModelEndMonth + 1}/${item.group.regressionEndYear}`
      : String(item.group.regressionModelYear ?? '—'),
    validation: [
      { label: 'Mean Report Year Value', key: 'meanReportYear' }, { label: 'Mean Baseline Year Value', key: 'meanBaselineYear' },
      { label: 'Range 1 — Minimum of Model Variable', key: 'modelMin', validity: 'modelMinValid' },
      { label: 'Range 1 — Maximum of Model Variable', key: 'modelMax', validity: 'modelMaxValid' },
      { label: 'Range 2 — Model Mean −3 Std Dev', key: 'modelMinus3StdDev', validity: 'modelMinus3StdDevValid' },
      { label: 'Range 2 — Model Mean +3 Std Dev', key: 'modelPlus3StdDev', validity: 'modelPlus3StdDevValid' }
    ].map(row => ({ label: row.label, cells: (item.model?.SEPValidation ?? []).map(validation => ({ value: validation[row.key] as number,
      failed: !!row.validity && validation[row.validity] === false })) }))
  };
}
function significant(value: number): string { return Number.isFinite(value) ? value.toLocaleString(undefined, { maximumSignificantDigits: 3, minimumSignificantDigits: 3 }) : '—'; }
