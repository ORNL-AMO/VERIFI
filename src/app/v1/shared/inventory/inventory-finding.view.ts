import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { StatusItem } from '@app/v1/status/status.models';
import { InventoryTileLink } from './inventory.models';

type FindingNavigation = Pick<WorkspaceNavigationService, 'facilityDataRoute' | 'facilityMeterRoute' | 'facilityPredictorRoute'>;

export function inventoryFindingAction(finding: StatusItem, navigation: FindingNavigation): InventoryTileLink | undefined {
  const destination = finding.destination;
  switch (destination.kind) {
    case 'meter-tab': return { label: destination.tab === 'quality' ? 'Review quality' : destination.tab === 'settings' ? 'Open settings' : 'Review readings',
      route: navigation.facilityMeterRoute(destination.facilityGuid, destination.meterGuid, destination.tab) };
    case 'predictor-tab': return { label: destination.tab === 'quality' ? 'Review quality' : destination.tab === 'settings' ? 'Open settings' : 'Review readings',
      route: navigation.facilityPredictorRoute(destination.facilityGuid, destination.predictorGuid, destination.tab) };
    case 'facility-data': return { label: destination.detail === 'meter-grouping' ? 'Open meter grouping' : destination.detail === 'predictors' ? 'Open predictors' : 'Open meters',
      route: navigation.facilityDataRoute(destination.facilityGuid, destination.detail) };
    default: return undefined;
  }
}
