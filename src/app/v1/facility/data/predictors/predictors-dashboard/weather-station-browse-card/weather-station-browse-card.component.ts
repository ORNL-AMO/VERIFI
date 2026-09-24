import { Component, Input, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IdbFacility } from '@data/models/idbModels/facility';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { ResourceBrowseCardComponent } from '@app/v1/shared/resource-browse-card/resource-browse-card.component';
import { ResourceBrowseCardView } from '@app/v1/shared/resource-browse-card/resource-browse-card.models';
import { WeatherStationGroupView } from '../../models';
import { FacilityPredictorsWorkspaceService } from '../../facility-predictors-workspace.service';

@Component({
  selector: 'app-weather-station-browse-card',
  templateUrl: './weather-station-browse-card.component.html',
  styleUrls: ['./weather-station-browse-card.component.css'],
  standalone: true,
  imports: [ResourceBrowseCardComponent]
})
export class WeatherStationBrowseCardComponent {
  private readonly router = inject(Router);
  private readonly navigation = inject(WorkspaceNavigationService);
  private readonly workspace = inject(FacilityPredictorsWorkspaceService, { optional: true });

  @Input({ required: true }) group!: WeatherStationGroupView;
  @Input() portfolioFacility: IdbFacility | undefined;
  @Input() showFacilityHeader = false;

  get resourceView(): ResourceBrowseCardView {
    const statusIcon = this.group.statusTone === 'danger' ? 'danger'
      : this.group.statusTone === 'warning' ? 'warning'
        : this.group.statusTone === 'info' ? 'loading' : 'success';
    return {
      title: this.group.stationName,
      openLabel: `Open ${this.group.stationName} weather workbench`,
      icon: 'cloudRain',
      statusTone: this.group.statusTone,
      owner: this.showFacilityHeader && this.portfolioFacility
        ? { label: this.portfolioFacility.name, icon: 'facility' } : undefined,
      chips: [
        { id: 'type', label: 'Weather station', icon: 'cloudRain', accentColor: 'var(--v1-facility)' },
        { id: 'outputs', label: `${this.group.predictors.length} output${this.group.predictors.length === 1 ? '' : 's'}`, tone: 'neutral' },
        { id: 'status', label: this.group.statusLabel, icon: statusIcon, tone: this.group.statusTone, loading: this.group.statusTone === 'info' }
      ],
      factSections: [{ id: 'summary', facts: [
        { id: 'outputs', label: 'Included outputs', valueLabel: this.group.outputSummary || 'None' },
        { id: 'entries', label: 'Entries', valueLabel: String(this.group.readingCount) },
        { id: 'first-reading', label: 'First reading', valueLabel: this.group.firstReadingLabel },
        { id: 'latest-reading', label: 'Latest', valueLabel: this.group.latestReadingLabel }
      ] }],
      notes: [
        ...(this.group.needsStationRepair ? [{ id: 'station-required', label: 'Select a station to repair this weather setup.', icon: 'warning' as const }] : []),
        ...(this.group.hasConflictingStationNames ? [{ id: 'station-names', label: 'Saved station names differ and should be reviewed.', icon: 'warning' as const }] : [])
      ]
    };
  }

  open(): void {
    const facility = this.portfolioFacility ?? this.workspace?.facility();
    if (facility) void this.router.navigate(this.navigation.facilityWeatherPredictorRoute(facility.guid, this.group.routeKey));
  }
}
