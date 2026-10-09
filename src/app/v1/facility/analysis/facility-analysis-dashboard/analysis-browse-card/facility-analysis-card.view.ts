import { ResourceBrowseCardView } from '@app/v1/shared/resource-browse-card/resource-browse-card.models';
import { IdbFacility } from '@data/models/idbModels/facility';
import { FacilityAnalysisCard, FacilityAnalysisDashboardCard } from '../facility-analysis.models';

interface FacilityAnalysisResourceViewOptions {
  readonly facility?: IdbFacility;
  readonly errorMessage?: string;
}

export function buildFacilityAnalysisResourceView(
  card: FacilityAnalysisCard | FacilityAnalysisDashboardCard,
  options: FacilityAnalysisResourceViewOptions = {}
): ResourceBrowseCardView {
  const categoryLabel = card.category === 'water' ? 'Water' : 'Energy';
  const basisLabel = card.category === 'water'
    ? 'Water'
    : card.analysis.energyIsSource ? 'Source energy' : 'Site energy';
  const outcomeDisplay = 'outcomeDisplay' in card ? card.outcomeDisplay : undefined;
  const tone = card.status === 'ready'
    ? 'success'
    : card.status === 'error' ? 'danger' : card.status === 'evaluating' ? 'info' : 'warning';
  return {
    title: card.analysis.name || 'Untitled analysis',
    openLabel: `Open ${card.analysis.name || 'analysis'}`,
    icon: card.category === 'water' ? 'droplet' : 'energy',
    statusTone: tone,
    owner: options.facility ? { label: options.facility.name, icon: 'facility' } : undefined,
    chips: [
      { id: 'category', label: categoryLabel, icon: card.category === 'water' ? 'droplet' : 'energy', tone: 'neutral' },
      ...(card.status === 'warning' || card.status === 'error' ? [{
        id: 'status',
        label: card.status === 'error' ? 'Invalid' : 'Needs review',
        icon: card.status === 'error' ? 'danger' as const : 'warning' as const,
        tone: card.status === 'error' ? 'danger' as const : 'warning' as const
      }] : []),
      ...(card.isActiveForReporting ? [{
        id: 'active',
        label: 'Active for Reporting',
        icon: 'target' as const,
        accentColor: 'var(--v1-primary)'
      }] : [])
    ],
    factSections: [
      ...(outcomeDisplay ? [{
        id: 'outcomes',
        ariaLabel: 'Latest analysis results',
        emphasis: 'primary' as const,
        facts: [
          { id: 'annual', ...outcomeDisplay.annual },
          { id: 'monthly', ...outcomeDisplay.monthly }
        ]
      }] : []),
      {
        id: 'setup',
        ariaLabel: 'Analysis context',
        emphasis: 'secondary',
        facts: [
          { id: 'baseline', label: 'Baseline', valueLabel: card.analysis.baselineYear ? String(card.analysis.baselineYear) : 'Not set', unavailable: !card.analysis.baselineYear },
          { id: 'basis', label: 'Basis and units', valueLabel: `${basisLabel}${analysisUnit(card) ? ` · ${analysisUnit(card)}` : ''}` },
          ...(!outcomeDisplay ? [{
            id: 'groups',
            label: 'Groups',
            valueLabel: String(card.analysis.groups?.length ?? 0)
          }] : [])
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
    errorMessage: options.errorMessage
  };
}

function analysisUnit(card: FacilityAnalysisCard): string | undefined {
  return card.category === 'water' ? card.analysis.waterUnit : card.analysis.energyUnit;
}
