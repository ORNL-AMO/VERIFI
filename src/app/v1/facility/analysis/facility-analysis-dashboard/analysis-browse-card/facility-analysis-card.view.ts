import { ResourceBrowseCardView } from '@app/v1/shared/resource-browse-card/resource-browse-card.models';
import { FacilityAnalysisDashboardCard } from '../facility-analysis.models';

export function buildFacilityAnalysisResourceView(
  card: FacilityAnalysisDashboardCard,
  errorMessage?: string
): ResourceBrowseCardView {
  const categoryLabel = card.category === 'water' ? 'Water' : 'Energy';
  const basisLabel = card.category === 'water'
    ? 'Water'
    : card.analysis.energyIsSource ? 'Source energy' : 'Site energy';
  const tone = card.status === 'ready'
    ? 'success'
    : card.status === 'error' ? 'danger' : card.status === 'evaluating' ? 'info' : 'warning';
  return {
    title: card.analysis.name || 'Untitled analysis',
    openLabel: `Open ${card.analysis.name || 'analysis'}`,
    icon: card.category === 'water' ? 'droplet' : 'energy',
    statusTone: tone,
    chips: [
      { id: 'category', label: categoryLabel, icon: card.category === 'water' ? 'droplet' : 'energy', tone: 'neutral' },
      { id: 'status', label: card.statusLabel, icon: card.status === 'evaluating' ? 'loading' : card.status === 'ready' ? 'success' : card.status === 'error' ? 'danger' : 'warning', tone, loading: card.status === 'evaluating' },
      ...(card.isActiveForReporting ? [{ id: 'active', label: 'Active for reporting', icon: 'target' as const, tone: 'info' as const }] : [])
    ],
    factSections: [
      {
        id: 'outcomes',
        ariaLabel: 'Latest analysis results',
        emphasis: 'primary',
        facts: [
          { id: 'annual', ...card.outcomeDisplay.annual },
          { id: 'monthly', ...card.outcomeDisplay.monthly }
        ]
      },
      {
        id: 'setup',
        ariaLabel: 'Analysis context',
        emphasis: 'secondary',
        facts: [
          { id: 'baseline', label: 'Baseline', valueLabel: card.analysis.baselineYear ? String(card.analysis.baselineYear) : 'Not set', unavailable: !card.analysis.baselineYear },
          { id: 'basis', label: 'Basis and units', valueLabel: `${basisLabel}${analysisUnit(card) ? ` · ${analysisUnit(card)}` : ''}` }
        ]
      }
    ],
    notes: card.findings.slice(0, 2).map(item => ({
      id: item.id,
      label: item.description,
      icon: item.severity === 'error' ? 'danger' : 'warning',
      tone: item.severity === 'error' ? 'danger' : 'warning'
    })),
    footerTag: {
      label: `Updated ${card.modifiedDateLabel} · ${card.dependencyCount > 0
        ? `${card.dependencyCount} downstream ${card.dependencyCount === 1 ? 'link' : 'links'}`
        : card.bankingSource ? 'Uses a banked analysis' : 'No downstream links'}`,
      icon: card.dependencyCount > 0 || card.bankingSource ? 'attachment' : 'info'
    },
    errorMessage
  };
}

function analysisUnit(card: FacilityAnalysisDashboardCard): string | undefined {
  return card.category === 'water' ? card.analysis.waterUnit : card.analysis.energyUnit;
}
