import { Component, computed, input } from '@angular/core';
import { AnalysisDataChecks } from '@domain/reports/analysis-data-checks';

@Component({ selector: 'app-analysis-data-checks', standalone: false,
  templateUrl: './analysis-data-checks.component.html', styleUrls: ['./analysis-data-checks.component.css'] })
export class AnalysisDataChecksComponent {
  readonly checks = input.required<readonly AnalysisDataChecks[]>();
  readonly groupNames = input<Readonly<Record<string, string>>>({});
  readonly facilityNames = input<Readonly<Record<string, string>>>({});
  readonly periods = computed(() => this.checks().map(check => ({ ...check, groups: check.groups.map(item => ({ ...item,
    facilityLabel: this.facilityNames()[item.facilityGuid] ?? item.facilityName,
    groupLabel: this.groupNames()[item.group.idbGroupId] ?? 'Analysis group',
    route: ['/v1', 'workspace', 'facility', item.facilityGuid, 'analysis', 'workbench', item.analysisGuid, 'group', item.group.idbGroupId,
      item.group.analysisType === 'regression' ? 'regression' : 'setup'],
    typeLabel: ({ regression: 'Regression', energyIntensity: 'Classic Intensity', modifiedEnergyIntensity: 'Modified Intensity', absoluteEnergyConsumption: 'Absolute Consumption' })[item.group.analysisType] ?? item.group.analysisType,
    predictors: item.group.predictorVariables?.filter(variable => variable.productionInAnalysis).map(variable => variable.name).join(', ') || '—',
    formula: item.model?.coef?.map((coefficient, index) => index === 0 ? significant(coefficient)
      : `(${significant(coefficient)} × ${item.model!.predictorVariables[index - 1]?.name ?? 'Unknown predictor'})`).join(' + ') ?? '—',
    variablePValues: item.model?.predictorVariables?.map((variable, index) => `${variable.name}: ${item.model!.t?.p?.[index + 1]?.toFixed(2) ?? '—'}`).join('; ') ?? '—',
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
  })) })));
}
function significant(value: number): string { return Number.isFinite(value) ? value.toLocaleString(undefined, { maximumSignificantDigits: 3, minimumSignificantDigits: 3 }) : '—'; }
