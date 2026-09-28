import { Component, Input, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IdbFacility } from '@data/models/idbModels/facility';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { ResourceBrowseCardComponent } from '@app/v1/shared/resource-browse-card/resource-browse-card.component';
import { ResourceBrowseCardView } from '@app/v1/shared/resource-browse-card/resource-browse-card.models';
import { WeatherStationGroupView } from '../../models';
import { FacilityPredictorsWorkspaceService } from '../../facility-predictors-workspace.service';
import { buildWeatherStationResourceView } from '../predictor-browse-card/predictor-browse-card.view';

@Component({
  selector: 'app-weather-station-browse-card',
  host: { class: 'v1-resource-browse-card-host' },
  templateUrl: './weather-station-browse-card.component.html',
  styleUrls: ['./weather-station-browse-card.component.css'],
  standalone: true,
  imports: [IconComponent, ResourceBrowseCardComponent]
})
export class WeatherStationBrowseCardComponent {
  private readonly router = inject(Router);
  private readonly navigation = inject(WorkspaceNavigationService);
  private readonly workspace = inject(FacilityPredictorsWorkspaceService);

  @Input({ required: true }) group!: WeatherStationGroupView;
  @Input() portfolioFacility: IdbFacility | undefined;
  @Input() showFacilityHeader = false;

  get resourceView(): ResourceBrowseCardView {
    const owner = this.showFacilityHeader ? this.portfolioFacility : undefined;
    return buildWeatherStationResourceView(this.group, owner);
  }

  open(): void {
    const facility = this.portfolioFacility ?? this.workspace.facility();
    if (facility) void this.router.navigate(this.navigation.facilityWeatherPredictorRoute(facility.guid, this.group.routeKey));
  }
}
