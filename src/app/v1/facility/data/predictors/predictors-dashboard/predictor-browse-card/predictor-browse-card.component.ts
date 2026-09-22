import { Component, Input, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IdbFacility } from '@data/models/idbModels/facility';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { ResourceBrowseCardComponent } from '@app/v1/shared/resource-browse-card/resource-browse-card.component';
import { ResourceBrowseCardAction, ResourceBrowseCardView } from '@app/v1/shared/resource-browse-card/resource-browse-card.models';
import { FacilityPredictorsWorkspaceService } from '../../facility-predictors-workspace.service';
import { PredictorCardView } from '../../models';

@Component({
  selector: 'app-predictor-browse-card',
  templateUrl: './predictor-browse-card.component.html',
  styleUrls: ['./predictor-browse-card.component.css'],
  standalone: true,
  imports: [ResourceBrowseCardComponent]
})
export class PredictorBrowseCardComponent {
  private readonly router = inject(Router);
  private readonly workspace = inject(FacilityPredictorsWorkspaceService, { optional: true });
  private readonly navigation = inject(WorkspaceNavigationService);

  @Input({ required: true }) card!: PredictorCardView;
  @Input() portfolioFacility: IdbFacility | undefined;
  @Input() showFacilityHeader = false;

  readonly actions: ReadonlyArray<ResourceBrowseCardAction> = [
    { id: 'readings', label: 'Open readings', icon: 'table' }
  ];

  get resourceView(): ResourceBrowseCardView {
    return {
      title: this.card.predictor.name || 'Untitled predictor',
      openLabel: `Open ${this.card.predictor.name || 'untitled predictor'} settings`,
      icon: this.card.icon,
      owner: this.showFacilityHeader && this.portfolioFacility
        ? { label: this.portfolioFacility.name, icon: 'facility' }
        : undefined,
      chips: [
        { id: 'type', label: this.card.typeLabel, icon: this.card.icon, accentColor: 'var(--v1-facility)' },
        { id: 'classification', label: this.card.classificationLabel, tone: 'neutral' }
      ],
      factSections: [{
        id: 'summary',
        facts: [
          { id: 'unit', label: 'Unit', valueLabel: this.card.unitLabel },
          { id: 'entries', label: 'Entries', valueLabel: String(this.card.readingCount) },
          { id: 'first-reading', label: 'First reading', valueLabel: this.card.firstReadingLabel },
          { id: 'latest-reading', label: 'Latest', valueLabel: this.card.latestReadingLabel }
        ]
      }]
    };
  }

  openSettings(): void {
    this.openTab('settings');
  }

  handleAction(actionId: string): void {
    if (actionId === 'readings') this.openTab('readings');
  }

  private openTab(tab: 'settings' | 'readings'): void {
    const facility = this.portfolioFacility ?? this.workspace?.facility();
    if (facility) {
      void this.router.navigate(this.navigation.facilityPredictorRoute(facility.guid, this.card.predictor.guid, tab));
    }
  }
}
