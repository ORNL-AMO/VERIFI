import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { StatusItem } from '@app/v1/status/status.models';
import { InventoryTileLink } from './inventory.models';

type FindingNavigation = Pick<WorkspaceNavigationService, 'facilityInventoryLink' | 'facilityDataToolRoute' | 'facilityMeterRoute' | 'facilityPredictorRoute'>;

export function inventoryFindingAction(finding: StatusItem, navigation: FindingNavigation): InventoryTileLink | undefined {
  const destination = finding.destination;
  switch (destination.kind) {
    case 'meter-tab': return { label: destination.tab === 'quality' ? 'Review quality' : destination.tab === 'settings' ? 'Open settings' : 'Review readings',
      route: navigation.facilityMeterRoute(destination.facilityGuid, destination.meterGuid, destination.tab) };
    case 'predictor-tab': return { label: destination.tab === 'quality' ? 'Review quality' : destination.tab === 'settings' ? 'Open settings' : 'Review readings',
      route: navigation.facilityPredictorRoute(destination.facilityGuid, destination.predictorGuid, destination.tab) };
    case 'facility-data': return { label: destination.detail === 'meter-grouping' ? 'Open meter grouping' : destination.detail === 'predictors' ? 'Open predictors' : 'Open meters',
      ...(destination.detail === 'meter-grouping' ? { route: navigation.facilityDataToolRoute(destination.facilityGuid, 'meter-grouping') } : { ...navigation.facilityInventoryLink(destination.facilityGuid, destination.detail === 'predictors' ? 'predictors' : 'meters'), facilityInventory: { facilityGuid: destination.facilityGuid, resource: destination.detail === 'predictors' ? 'predictors' : 'meters' } }) };
    default: return undefined;
  }
}
