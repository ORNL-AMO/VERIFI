import type { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import type { VisualizationDefinition, VisualizationScope } from '@domain/visualizations/visualization-definition';
import { predictorCatalog, predictorContext, predictorSeriesId, predictorUnit, resolvePredictorSelection } from '@domain/visualizations/predictor/predictor-source';
import { resolveVisualizationFacilities } from '@domain/visualizations/visualization-facilities';
import type { DecisionResourceChoice, VisualizationDecisionItem } from '../decisions/decision-types';
import { isCustomized, itemKey, resolveItemPresentation } from '../shared/item-appearance';
import { predictorIcon } from '@app/v1/data/predictors/models/predictor-card.models';

export interface PredictorResourceChoice extends DecisionResourceChoice { readonly cardDetail?: string; }

export function predictorResourceChoices(snapshot: AccountWorkspaceSnapshot, scope: VisualizationScope): readonly PredictorResourceChoice[] {
  const predictors = predictorCatalog(snapshot, scope);
  return predictors.map(predictor => {
    const facility = snapshot.facilities.find(f => f.guid === predictor.facilityId)?.name;
    return { value: predictor.guid, label: predictor.name || 'Unnamed predictor', icon: predictorIcon(predictor),
      detail: [scope.facilityGuids.length > 1 ? facility : '', predictorContext(predictor)].filter(Boolean).join(' · '),
      cardDetail: scope.facilityGuids.length > 1 ? facility : '', available: true };
  });
}
export function projectPredictorItems(definition: VisualizationDefinition, sourceId: string, snapshot: AccountWorkspaceSnapshot): readonly VisualizationDecisionItem[] {
  const source = definition.sources.find(s => s.id === sourceId);
  if (source?.kind !== 'predictor') return [];
  const scope = resolveVisualizationFacilities(definition, snapshot.facilities).scope;
  const choices = predictorResourceChoices(snapshot, scope);
  const predictors = snapshot.predictors.filter(p => p.accountId === definition.accountGuid && scope.facilityGuids.includes(p.facilityId)
    && snapshot.facilities.some(f => f.guid === p.facilityId && f.accountId === definition.accountGuid));
  return resolvePredictorSelection(snapshot, scope, source).map(guid => {
    const choice = choices.find(c => c.value === guid), identity = { resourceGuid: guid }, id = predictorSeriesId(sourceId, guid);
    const { series, override, appearance } = resolveItemPresentation(definition,
      { sourceId, metric: 'value', identity, providerSeriesId: id });
    const predictor = predictors.find(p => p.guid === guid);
    return { key: itemKey(identity), sourceId, selectedId: series?.id ?? `${sourceId}-series`, identity,
      label: choice?.label ?? predictor?.name ?? `Unavailable: ${guid}`,
      detail: scope.facilityGuids.length > 1 && predictor ? snapshot.facilities.find(f => f.guid === predictor.facilityId)?.name ?? '' : '',
      unit: predictor ? predictorUnit(predictor) : '',
      available: !!choice, missing: !predictor, customized: !!series && isCustomized(series) || !!override && isCustomized(override, true),
      customColor: appearance.color !== undefined && (series?.color !== undefined || override?.color !== undefined),
      appearance };
  });
}
