import { ResourceBrowseCardView } from '@app/v1/shared/resource-browse-card/resource-browse-card.models';
import { AccountAnalysisDashboardCard, accountAnalysisSelectionSummary } from '../account-analysis.models';

export function buildAccountAnalysisResourceView(card: AccountAnalysisDashboardCard): ResourceBrowseCardView {
  const categoryLabel = card.category === 'water' ? 'Water' : 'Energy';
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
      ...(card.status === 'evaluating' ? [{
        id: 'status', label: 'Evaluating', icon: 'loading' as const, tone: 'info' as const, loading: true
      }] : []),
      ...(card.status === 'warning' || card.status === 'error' ? [{
        id: 'status',
        label: card.status === 'error' ? 'Invalid' : 'Needs review',
        icon: card.status === 'error' ? 'danger' as const : 'warning' as const,
        tone: card.status === 'error' ? 'danger' as const : 'warning' as const
      }] : []),
      ...(card.isActiveForReporting ? [{
        id: 'active', label: 'Active for Reporting', icon: 'target' as const, accentColor: 'var(--v1-primary)'
      }] : [])
    ],
    factSections: [{
      id: 'outcomes',
      ariaLabel: 'Latest account analysis results',
      emphasis: 'primary',
      facts: [
        { id: 'annual', ...card.outcomeDisplay.annual },
        { id: 'monthly', ...card.outcomeDisplay.monthly }
      ]
    }, {
      id: 'setup',
      ariaLabel: 'Account analysis context',
      emphasis: 'secondary',
      facts: [
        { id: 'baseline', label: 'Baseline', valueLabel: card.analysis.baselineYear ? String(card.analysis.baselineYear) : 'Not set', unavailable: !card.analysis.baselineYear },
        { id: 'basis', label: 'Basis and units', valueLabel: `${card.basisLabel} · ${card.unitLabel}` },
        { id: 'facilities', label: 'Facility selections', valueLabel: accountAnalysisSelectionSummary(card.selectionCounts) }
      ]
    }],
    notes: card.findings.slice(0, 2).map(item => ({
      id: item.id,
      label: item.description,
      icon: item.severity === 'error' ? 'danger' : 'warning',
      tone: item.severity === 'error' ? 'danger' : 'warning'
    })),
    footerTag: {
      label: `Updated ${card.modifiedDateLabel} · ${card.linkedReports.length
        ? `${card.linkedReports.length} linked ${card.linkedReports.length === 1 ? 'report' : 'reports'}`
        : 'No linked reports'}`,
      icon: card.linkedReports.length ? 'attachment' : 'info'
    }
  };
}
