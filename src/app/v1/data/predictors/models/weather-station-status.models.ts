import type { IconName } from '@app/v1/shared/icons/icon-registry';
import type { StatusItem, StatusSeverity } from '@app/v1/status/status.models';
import type { IdbPredictor } from '@data/models/idbModels/predictor';

export type WeatherStationStatusSection = 'setup' | 'readings' | 'quality';

export interface WeatherStationStatusCheck {
  readonly id: string;
  readonly section: WeatherStationStatusSection;
  readonly scopeLabel: string;
  readonly title: string;
  readonly detail: string;
  readonly severity: 'error' | 'warning';
  readonly icon: IconName;
  readonly findingCount: number;
  readonly predictorGuids: readonly string[];
}

export function buildWeatherStationStatusChecks(
  predictors: readonly IdbPredictor[],
  findings: readonly StatusItem[]
): readonly WeatherStationStatusCheck[] {
  const predictorsByGuid = new Map(predictors.map(predictor => [predictor.guid, predictor]));
  const groups = new Map<string, StatusItem[]>();

  findings.forEach(finding => {
    if (finding.entity.kind !== 'predictor' || !predictorsByGuid.has(finding.entity.guid)
      || finding.destination.kind !== 'predictor-tab'
      || (finding.severity !== 'error' && finding.severity !== 'warning')) return;
    const section = statusSection(finding.destination.tab);
    const key = section === 'quality'
      ? `${section}:${finding.entity.guid}:${finding.code}`
      : `${section}:${finding.code}`;
    groups.set(key, [...(groups.get(key) ?? []), finding]);
  });

  return [...groups.entries()].map(([id, groupedFindings]) => {
    const first = groupedFindings[0];
    const section = statusSection((first.destination as Extract<StatusItem['destination'], { kind: 'predictor-tab' }>).tab);
    const affectedPredictors = groupedFindings
      .map(finding => predictorsByGuid.get(finding.entity.guid))
      .filter((predictor): predictor is IdbPredictor => !!predictor)
      .filter((predictor, index, values) => values.findIndex(item => item.guid === predictor.guid) === index)
      .sort((left, right) => (left.name || '').localeCompare(right.name || '') || left.guid.localeCompare(right.guid));
    const severity = highestSeverity(groupedFindings.map(finding => finding.severity));
    const icon: IconName = severity === 'error' ? 'danger' : first.category === 'currency' ? 'clock' : 'warning';
    return {
      id,
      section,
      scopeLabel: section === 'quality'
        ? `${affectedPredictors[0]?.name || 'Predictor'} Quality`
        : section === 'setup' ? 'Setup' : 'Readings',
      title: first.title,
      detail: groupedFindings.length === 1
        ? first.description
        : `${affectedPredictors.length} predictors: ${affectedPredictors.map(predictor => predictor.name).join(', ')}`,
      severity,
      icon,
      findingCount: groupedFindings.length,
      predictorGuids: affectedPredictors.map(predictor => predictor.guid)
    };
  }).sort((left, right) => sectionRank(left.section) - sectionRank(right.section)
    || severityRank(left.severity) - severityRank(right.severity)
    || left.scopeLabel.localeCompare(right.scopeLabel)
    || left.title.localeCompare(right.title));
}

function statusSection(tab: 'settings' | 'readings' | 'quality'): WeatherStationStatusSection {
  return tab === 'settings' ? 'setup' : tab;
}

function highestSeverity(severities: readonly StatusSeverity[]): 'error' | 'warning' {
  return severities.includes('error') ? 'error' : 'warning';
}

function sectionRank(section: WeatherStationStatusSection): number {
  return section === 'setup' ? 0 : section === 'readings' ? 1 : 2;
}

function severityRank(severity: 'error' | 'warning'): number {
  return severity === 'error' ? 0 : 1;
}
