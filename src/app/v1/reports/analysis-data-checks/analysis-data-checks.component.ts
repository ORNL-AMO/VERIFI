import { Component, ElementRef, Injector, afterNextRender, computed, inject, input, signal, viewChildren } from '@angular/core';
import { AnalysisDataChecks } from '@domain/reports/analysis-data-checks';
import { StatusItem } from '@app/v1/status/status.models';
import { analysisGroupIssues } from '../analysis-checks.models';

@Component({ selector: 'app-analysis-data-checks', standalone: false,
  templateUrl: './analysis-data-checks.component.html', styleUrls: ['./analysis-data-checks.component.css'] })
export class AnalysisDataChecksComponent {
  readonly checks = input.required<readonly AnalysisDataChecks[]>();
  readonly findings = input<readonly StatusItem[]>([]);
  private readonly details = viewChildren<ElementRef<HTMLElement>>('validationPanel');
  private readonly rowButtons = viewChildren<ElementRef<HTMLButtonElement>>('validationButton');
  private readonly injector = inject(Injector);
  readonly expandedKeys = signal<ReadonlySet<string>>(new Set());
  readonly groupNames = input<Readonly<Record<string, string>>>({});
  readonly facilityNames = input<Readonly<Record<string, string>>>({});
  readonly periods = computed(() => this.checks().map(check => ({ ...check, groups: check.groups.map(item => ({ ...item, ...analysisGroupIssues(item),
    key: JSON.stringify([check.reportYear, item.facilityGuid, item.analysisGuid, item.group.idbGroupId]),
    groupKey: JSON.stringify([item.facilityGuid, item.analysisGuid, item.group.idbGroupId]),
    validationId: 'analysis-validation-' + encodeURIComponent(JSON.stringify([check.reportYear, item.facilityGuid, item.analysisGuid, item.group.idbGroupId])),
    facilityLabel: this.facilityNames()[item.facilityGuid] ?? item.facilityName,
    groupLabel: this.groupNames()[item.group.idbGroupId] ?? 'Analysis group',
    route: ['/v1', 'workspace', 'facility', item.facilityGuid, 'analysis', 'workbench', item.analysisGuid, 'group', item.group.idbGroupId,
      item.group.analysisType === 'regression' ? 'regression' : 'setup'],
    typeLabel: ({ regression: 'Regression', energyIntensity: 'Classic Intensity', modifiedEnergyIntensity: 'Modified Intensity', absoluteEnergyConsumption: 'Absolute Consumption' })[item.group.analysisType] ?? item.group.analysisType,
    predictors: item.group.predictorVariables?.filter(variable => variable.productionInAnalysis).map(variable => variable.name).join(', ') || '—',
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
  })) })));
  readonly rows = computed(() => this.periods().flatMap(period => period.groups.map(item => ({ ...item, reportYear: period.reportYear }))));
  readonly summaryGroups = computed(() => {
    const rows = this.rows();
    const groups = new Map<string, { key: string; caption: string; regression: boolean; rows: typeof rows }>();
    for (const row of rows) {
      const key = JSON.stringify([row.reportYear, row.group.analysisType]);
      let group = groups.get(key);
      if (!group) {
        group = { key, caption: `${row.reportYear} — Analysis type: ${row.typeLabel}`, regression: row.group.analysisType === 'regression', rows: [] };
        groups.set(key, group);
      }
      group.rows.push(row);
    }
    return [...groups.values()];
  });
  readonly issues = computed(() => this.rows().flatMap(item => [
    ...item.critical.map(note => ({ key: item.key, item, note, severity: 'Critical' })),
    ...item.moderate.map(note => ({ key: item.key, item, note, severity: 'Moderate' })),
    ...item.minor.map(note => ({ key: item.key, item, note, severity: 'Minor' }))
  ]));
  readonly overview = computed(() => {
    const rows = this.rows(), findings = this.findings();
    return { hasResults: this.checks().length > 0,
      critical: rows.reduce((sum, item) => sum + item.critical.length, 0) + findings.filter(item => item.severity === 'error').length,
      moderate: rows.reduce((sum, item) => sum + item.moderate.length, 0) + findings.filter(item => item.severity === 'warning').length,
      minor: rows.reduce((sum, item) => sum + item.minor.length, 0),
      emptyPeriods: this.checks().filter(item => !item.groups.length).map(item => item.reportYear)
    };
  });
  readonly issueCards = computed(() => {
    const issues = this.issues();
    const groups = new Map<string, { key: string; facilityLabel: string; groupLabel: string; issues: typeof issues }>();
    for (const issue of issues) {
      let card = groups.get(issue.item.groupKey);
      if (!card) {
        card = { key: issue.item.groupKey, facilityLabel: issue.item.facilityLabel, groupLabel: issue.item.groupLabel, issues: [] };
        groups.set(card.key, card);
      }
      card.issues.push(issue);
    }
    return [...groups.values()].map(card => ({ ...card, count: card.issues.length,
      tone: card.issues.some(issue => issue.severity === 'Critical') ? 'danger'
        : card.issues.some(issue => issue.severity === 'Moderate') ? 'warning' : 'info' }));
  });
  readonly reportFindings = computed(() => this.findings().map(finding => ({ ...finding,
    severityLabel: finding.severity === 'error' ? 'Critical' : finding.severity === 'warning' ? 'Moderate' : 'Information' })));

  toggleValidation(key: string): void {
    if (this.expandedKeys().has(key)) this.closeValidation(key);
    else this.expandedKeys.update(keys => new Set([...keys, key]));
  }

  closeValidation(key: string): void {
    this.expandedKeys.update(keys => new Set([...keys].filter(item => item !== key)));
    afterNextRender(() => this.rowButtons().find(item => item.nativeElement.dataset['checkKey'] === key)?.nativeElement.focus(), { injector: this.injector });
  }

  openGroup(key: string): void {
    this.expandedKeys.update(keys => new Set([...keys, key]));
    afterNextRender(() => {
      const panel = this.details().find(item => item.nativeElement.dataset['checkKey'] === key)?.nativeElement;
      panel?.focus();
      panel?.scrollIntoView?.({ block: 'nearest' });
    }, { injector: this.injector });
  }

}
function significant(value: number): string { return Number.isFinite(value) ? value.toLocaleString(undefined, { maximumSignificantDigits: 3, minimumSignificantDigits: 3 }) : '—'; }
