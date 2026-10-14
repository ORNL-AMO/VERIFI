import type { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import type { IdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import type { IdbPredictor } from '@data/models/idbModels/predictor';
import type { IdbPredictorData } from '@data/models/idbModels/predictorData';
import type { IconName } from '@app/v1/shared/icons/icon-registry';
import { meterSourceIcon } from '@app/v1/facility/data/meters/models';
import { buildWeatherStationGroups, predictorIcon } from '@app/v1/facility/data/predictors/models';
import { summarizeStatusAttention } from '@app/v1/status/status.dismissals';
import type { StatusAttentionSummary, StatusItem } from '@app/v1/status/status.models';
export type ResourceNavGroupId = 'meters' | 'meter-grouping' | 'predictors';

export interface NavigationLink {
  readonly id: string;
  readonly label: string;
  readonly icon: IconName;
  readonly route: readonly string[];
  readonly active: boolean;
  readonly attention?: StatusAttentionSummary;
  readonly outputs?: readonly { readonly guid: string; readonly label: string; readonly icon: IconName }[];
}

export interface ResourceNavGroup extends NavigationLink {
  readonly id: ResourceNavGroupId;
  readonly facilityGuid: string;
  readonly routeActive: boolean;
  readonly childrenId: string;
  readonly childrenLabel: string;
  readonly children: readonly NavigationLink[];
}

export const ACCOUNT_CUSTOM_DATA_ITEMS: readonly { id: string; label: string; icon: IconName }[] = [
  { id: 'custom-grid-factors', label: 'Grid Factors', icon: 'table' },
  { id: 'custom-fuels', label: 'Fuels', icon: 'fuel' },
  { id: 'custom-gwps', label: 'Global Warming Potentials', icon: 'earth' }
];

export interface ResourceNavRoutes {
  facilityDataRoute: (facilityGuid: string, detail: string) => readonly string[];
  facilityMeterRoute: (facilityGuid: string, meterGuid: string, tab: 'settings') => readonly string[];
  facilityMeterGroupRoute: (facilityGuid: string, groupGuid: string, tab: 'monthly-table') => readonly string[];
  facilityPredictorRoute: (facilityGuid: string, predictorGuid: string, tab: 'settings') => readonly string[];
  facilityWeatherPredictorRoute: (facilityGuid: string, key: string) => readonly string[];
}

export interface ResourceNavInput {
  readonly facilityGuid: string;
  readonly detail: string;
  readonly activeMeterGuid?: string;
  readonly activeGroupGuid?: string;
  readonly activePredictorGuid?: string;
  readonly activeWeatherKey?: string;
  readonly meters: readonly IdbUtilityMeter[];
  readonly groups: readonly IdbUtilityMeterGroup[];
  readonly predictors: readonly IdbPredictor[];
  readonly predictorData: readonly IdbPredictorData[];
  readonly findings: readonly StatusItem[];
  readonly statusReady: boolean;
}

function attention(findings: readonly StatusItem[]): StatusAttentionSummary | undefined {
  const summary = summarizeStatusAttention(findings);
  return summary.total > 0 ? summary : undefined;
}

export function buildResourceNavGroups(input: ResourceNavInput, routes: ResourceNavRoutes): readonly ResourceNavGroup[] {
  const { facilityGuid } = input;
  const findings = input.statusReady ? input.findings : [];
  const sorted = (items: readonly NavigationLink[]) => [...items].sort((first, second) => first.label.localeCompare(second.label));
  const parentAttention = (kind: 'meter-tab' | 'predictor-tab', detail: string) => attention(findings.filter(item =>
    (item.destination.kind === kind && item.destination.facilityGuid === facilityGuid)
    || (item.destination.kind === 'facility-data' && item.destination.facilityGuid === facilityGuid && item.destination.detail === detail)
  ));
  const meterChildren: NavigationLink[] = input.meters.map(meter => ({
    id: meter.guid, label: meter.name || 'Untitled meter', icon: meterSourceIcon(meter.source),
    route: routes.facilityMeterRoute(facilityGuid, meter.guid, 'settings'), active: input.activeMeterGuid === meter.guid,
    attention: attention(findings.filter(item => item.entity.guid === meter.guid))
  }));
  const groupChildren: NavigationLink[] = input.groups.map(group => ({
    id: group.guid, label: group.name || 'Untitled group', icon: 'meterGroupItem',
    route: routes.facilityMeterGroupRoute(facilityGuid, group.guid, 'monthly-table'), active: input.activeGroupGuid === group.guid
  }));
  const standardChildren: NavigationLink[] = input.predictors.filter(predictor => predictor.predictorType !== 'Weather').map(predictor => ({
    id: predictor.guid, label: predictor.name || 'Untitled predictor', icon: predictorIcon(predictor),
    route: routes.facilityPredictorRoute(facilityGuid, predictor.guid, 'settings'), active: input.activePredictorGuid === predictor.guid,
    attention: attention(findings.filter(item => item.entity.guid === predictor.guid))
  }));
  const weatherChildren: NavigationLink[] = buildWeatherStationGroups(input.predictors, input.predictorData, findings, input.statusReady).map(group => ({
    id: group.routeKey, label: group.stationName, icon: 'cloudRain',
    route: routes.facilityWeatherPredictorRoute(facilityGuid, group.routeKey), active: input.activeWeatherKey === group.routeKey,
    attention: input.statusReady ? attention(group.statusFindings) : undefined,
    outputs: group.predictors.map(predictor => ({ guid: predictor.guid, label: predictor.name || 'Untitled predictor', icon: predictorIcon(predictor) }))
  }));
  return [
    {
      id: 'meters', label: 'Meters', icon: 'meter', route: routes.facilityDataRoute(facilityGuid, 'meters'),
      active: input.detail === 'meters' && !input.activeMeterGuid, routeActive: input.detail === 'meters', facilityGuid,
      childrenId: `v1-meter-nav-items-${facilityGuid}`, childrenLabel: 'Meter links', children: sorted(meterChildren),
      attention: parentAttention('meter-tab', 'meters')
    },
    {
      id: 'meter-grouping', label: 'Meter Grouping', icon: 'meterGroup', route: routes.facilityDataRoute(facilityGuid, 'meter-grouping'),
      active: input.detail === 'meter-grouping' && !input.activeGroupGuid, routeActive: input.detail === 'meter-grouping', facilityGuid,
      childrenId: `v1-meter-group-nav-items-${facilityGuid}`, childrenLabel: 'Meter group links', children: sorted(groupChildren)
    },
    {
      id: 'predictors', label: 'Predictors', icon: 'predictor', route: routes.facilityDataRoute(facilityGuid, 'predictors'),
      active: input.detail === 'predictors' && !input.activePredictorGuid && !input.activeWeatherKey, routeActive: input.detail === 'predictors', facilityGuid,
      childrenId: `v1-predictor-nav-items-${facilityGuid}`, childrenLabel: 'Predictor links', children: sorted([...standardChildren, ...weatherChildren]),
      attention: parentAttention('predictor-tab', 'predictors')
    }
  ];
}
