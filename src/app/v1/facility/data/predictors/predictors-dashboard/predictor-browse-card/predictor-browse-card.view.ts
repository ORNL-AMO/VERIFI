import { IdbFacility } from '@data/models/idbModels/facility';
import { ResourceBrowseCardView } from '@app/v1/shared/resource-browse-card/resource-browse-card.models';
import { buildWeatherStationStatusChecks, PredictorCardView, WeatherStationGroupView } from '../../models';

export function buildPredictorResourceView(
  card: PredictorCardView,
  facility?: IdbFacility,
  errorMessage?: string
): ResourceBrowseCardView {
  return {
    title: card.predictor.name || 'Untitled predictor',
    openLabel: `Open ${card.predictor.name || 'untitled predictor'} settings`,
    icon: card.icon,
    statusTone: card.statusTone,
    owner: facility ? { label: facility.name, icon: 'facility' } : undefined,
    chips: [
      { id: 'production', label: card.productionLabel, icon: card.icon, accentColor: 'var(--v1-facility)' },
      { id: 'status', label: card.statusLabel, icon: card.statusIcon, tone: card.statusTone, loading: card.statusTone === 'info' }
    ],
    factSections: [
      { id: 'summary', facts: [
        { id: 'unit', label: 'Unit', valueLabel: card.unitLabel },
        { id: 'entries', label: 'Entries', valueLabel: String(card.readingCount) },
        { id: 'first-reading', label: 'First reading', valueLabel: card.firstReadingLabel },
        { id: 'latest-reading', label: 'Latest', valueLabel: card.latestReadingLabel },
        ...(card.weatherStationLabel ? [{ id: 'station', label: 'Station', valueLabel: card.weatherStationLabel }] : []),
        ...(card.baseTemperatureLabel ? [{ id: 'base-temperature', label: 'Weather setup', valueLabel: card.baseTemperatureLabel }] : [])
      ] },
      {
        id: 'statistics',
        ariaLabel: 'Predictor statistics',
        emphasis: 'secondary',
        note: card.statistics.unitLabel ? `Values shown in ${card.statistics.unitLabel}` : undefined,
        facts: card.statistics.facts.map(fact => ({ ...fact, metaLabel: fact.periodLabel }))
      }
    ],
    notes: card.statusActionSummaries.map((summary, index) => ({
      id: `status-${index}`, label: summary, icon: card.statusIcon
    })),
    footerTag: card.weatherTypeLabel ? { label: card.weatherTypeLabel, icon: card.icon } : undefined,
    errorMessage
  };
}

export function buildWeatherStationResourceView(
  group: WeatherStationGroupView,
  facility?: IdbFacility
): ResourceBrowseCardView {
  const statusIcon = group.statusTone === 'danger' ? 'danger'
    : group.statusTone === 'warning' ? 'warning'
      : group.statusTone === 'info' ? 'loading' : 'success';
  const statusChecks = buildWeatherStationStatusChecks(group.predictors, group.statusFindings);
  return {
    title: group.stationName,
    openLabel: `Open ${group.stationName} weather workbench`,
    icon: 'cloudRain',
    statusTone: group.statusTone,
    owner: facility ? { label: facility.name, icon: 'facility' } : undefined,
    chips: [
      { id: 'type', label: 'Weather station', icon: 'cloudRain', accentColor: 'var(--v1-facility)' },
      { id: 'status', label: group.statusLabel, icon: statusIcon, tone: group.statusTone, loading: group.statusTone === 'info' }
    ],
    factSections: [{ id: 'summary', facts: [
      { id: 'station-id', label: 'Station ID', valueLabel: group.stationId || 'Not set' },
      { id: 'entries', label: 'Entries', valueLabel: String(group.readingCount) },
      { id: 'first-reading', label: 'First reading', valueLabel: group.firstReadingLabel },
      { id: 'latest-reading', label: 'Latest', valueLabel: group.latestReadingLabel }
    ] }],
    notes: [
      ...statusChecks.map(check => ({
        id: `status-${check.id}`,
        label: `${check.scopeLabel}: ${check.title} — ${check.detail}`,
        icon: check.icon,
        tone: check.severity === 'error' ? 'danger' as const : 'warning' as const
      })),
      ...(group.needsStationRepair
        ? [{ id: 'station-required', label: 'Select a station to repair this weather setup.', icon: 'warning' as const }]
        : []),
      ...(group.hasConflictingStationNames
        ? [{ id: 'station-names', label: 'Saved station names differ and should be reviewed.', icon: 'warning' as const }]
        : [])
    ]
  };
}
