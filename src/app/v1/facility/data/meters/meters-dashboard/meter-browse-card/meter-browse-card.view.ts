import { IdbFacility } from '@data/models/idbModels/facility';
import { ResourceBrowseCardView } from '@app/v1/shared/resource-browse-card/resource-browse-card.models';
import { MeterCardView, MeterUsageFactsView } from '../../models';

export const EMPTY_METER_USAGE_FACTS: MeterUsageFactsView = {
  facts: [
    { id: 'latest-month', label: 'Latest month', valueLabel: 'Not available', unavailable: true },
    { id: 'previous-year-month', label: 'Same month last year', valueLabel: 'Not available', unavailable: true },
    { id: 'latest-twelve-month-average', label: 'Latest 12-mo avg', valueLabel: 'Not available', unavailable: true },
    { id: 'previous-twelve-month-average', label: 'Previous 12-mo avg', valueLabel: 'Not available', unavailable: true }
  ]
};

export function buildMeterResourceView(
  card: MeterCardView,
  options: {
    readonly facility?: IdbFacility;
    readonly usageFactsLoading?: boolean;
    readonly errorMessage?: string;
  } = {}
): ResourceBrowseCardView {
  const usageFacts = card.usageFacts ?? (options.usageFactsLoading ? EMPTY_METER_USAGE_FACTS : undefined);
  return {
    title: card.meter.name,
    openLabel: `Open ${card.meter.name} settings`,
    icon: card.sourceIcon || 'meter',
    iconColor: card.sourceColor,
    statusTone: card.statusTone,
    owner: options.facility ? { label: options.facility.name, icon: 'facility' } : undefined,
    chips: [
      { id: 'source', label: card.meter.source, icon: card.sourceIcon || 'meter', accentColor: card.sourceColor },
      {
        id: 'status',
        label: card.statusLabel || 'Checking',
        icon: card.statusIcon || 'loading',
        tone: card.statusTone || 'info',
        loading: !card.statusIcon || card.statusIcon === 'loading'
      }
    ],
    factSections: [
      {
        id: 'identity',
        facts: [
          { id: 'first-reading', label: 'First reading', valueLabel: card.firstReadingLabel || 'No data' },
          { id: 'latest-reading', label: 'Latest', valueLabel: card.latestReadingLabel || 'No data' },
          { id: 'scope', label: 'Scope', valueLabel: card.scopeLabel || 'Not set' },
          ...(card.fuelLabel ? [{ id: 'fuel', label: 'Fuel', valueLabel: card.fuelLabel }] : [])
        ]
      },
      ...(usageFacts
        ? [{
          id: 'usage',
          ariaLabel: 'Meter usage facts',
          emphasis: 'secondary' as const,
          note: usageFacts.unitLabel
            ? `Usage values shown in ${usageFacts.basisLabel ? usageFacts.basisLabel + ' ' : ''}${usageFacts.unitLabel}/month`
            : undefined,
          facts: usageFacts.facts.map(fact => ({
            ...fact,
            metaLabel: fact.periodLabel,
            loading: options.usageFactsLoading
          }))
        }]
        : [])
    ],
    notes: card.statusActionSummaries?.map((summary, index) => ({
      id: `status-${index}`,
      label: summary,
      icon: card.statusIcon || 'loading',
      loading: !card.statusIcon || card.statusIcon === 'loading'
    })),
    footerTag: { label: card.group?.name || 'Ungrouped', icon: 'meterGroupItem' },
    errorMessage: options.errorMessage
  };
}
