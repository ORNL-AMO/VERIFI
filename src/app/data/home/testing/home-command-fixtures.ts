import { HOME_STARTERS, HomeOwner } from '@domain/home/home-dashboard';
import { createVisualizationDefinition } from '@domain/visualizations/visualization-definition';
import { chartWidget, homeDefinition } from '@domain/home/testing/home-fixtures';
import { HomeTemplateBlueprint } from '../home-template-graph';

/** Small storage fixtures, deliberately independent of Home6's full shipped compositions. */
export function storageBlueprints(owner: HomeOwner = { kind: 'account', guid: 'account-a' }, accountGuid = owner.kind === 'account' ? owner.guid : 'account-a'): HomeTemplateBlueprint[] {
  const chart = createVisualizationDefinition('Shared starter', accountGuid, owner.kind === 'account' ? { kind: 'all' }
    : { kind: 'fixed', facilityGuids: [owner.guid] }, 'utility');
  return HOME_STARTERS.map((template, index) => ({ template, version: 1,
    dashboard: { ...homeDefinition(index < 2 ? [chartWidget('trend')] : []), name: template,
      visibility: template === 'water' ? 'water' : template === 'emissions' ? 'emissions' : 'always' },
    charts: index < 2 ? [{ key: 'trend', definition: { ...chart, name: index === 0 ? 'Home trend' : 'Goal trend' } }] : [] }));
}
