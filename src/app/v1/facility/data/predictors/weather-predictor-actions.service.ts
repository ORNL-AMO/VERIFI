import { Injectable, inject } from '@angular/core';
import {
  WeatherMaintenancePreview,
  WeatherPredictorGenerationPreview,
  WeatherStationGroupPreview,
  WeatherStationMonthChangeSet
} from './models';
import { PredictorWorkspaceActionsService } from './predictor-workspace-actions.service';

/** Weather-specific command surface used by the reviewed Weather workflows. */
@Injectable()
export class WeatherPredictorActionsService {
  private readonly actions = inject(PredictorWorkspaceActionsService);

  createWeatherPredictors(preview: WeatherPredictorGenerationPreview): Promise<void> {
    return this.actions.createWeatherPredictors(preview);
  }

  applyWeatherMaintenance(preview: WeatherMaintenancePreview): Promise<void> {
    return this.actions.applyWeatherMaintenance(preview);
  }

  applyWeatherSettings(preview: WeatherMaintenancePreview): Promise<void> {
    return this.actions.applyWeatherSettings(preview);
  }

  applyWeatherStationGroup(preview: WeatherStationGroupPreview): Promise<void> {
    return this.actions.applyWeatherStationGroup(preview);
  }

  applyWeatherStationMonth(changes: WeatherStationMonthChangeSet): Promise<void> {
    return this.actions.applyWeatherStationMonth(changes);
  }
}
