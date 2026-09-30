import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ResourceBrowseCardComponent } from '@app/v1/shared/resource-browse-card/resource-browse-card.component';
import { ResourceBrowseCardAction } from '@app/v1/shared/resource-browse-card/resource-browse-card.models';
import { FacilityAnalysisCard } from '../../facility-analysis.models';
import { buildFacilityAnalysisResourceView } from '../../facility-analysis-card.view';

@Component({
  selector: 'app-analysis-browse-card',
  host: { class: 'v1-resource-browse-card-host' },
  standalone: true,
  imports: [ResourceBrowseCardComponent],
  templateUrl: './analysis-browse-card.component.html',
  styleUrls: ['./analysis-browse-card.component.css']
})
export class AnalysisBrowseCardComponent {
  @Input({ required: true }) card!: FacilityAnalysisCard;
  @Input() selectedForComparison = false;
  @Output() opened = new EventEmitter<FacilityAnalysisCard>();
  @Output() detailsRequested = new EventEmitter<FacilityAnalysisCard>();
  @Output() comparisonToggled = new EventEmitter<FacilityAnalysisCard>();

  get view() { return buildFacilityAnalysisResourceView(this.card); }
  get actions(): readonly ResourceBrowseCardAction[] {
    return [
      { id: 'details', label: 'View analysis details', icon: 'monocle' },
      { id: 'compare', label: this.selectedForComparison ? 'Remove from comparison' : 'Add to comparison', icon: 'transfer' }
    ];
  }

  selectAction(id: string): void {
    if (id === 'details') this.detailsRequested.emit(this.card);
    if (id === 'compare') this.comparisonToggled.emit(this.card);
  }
}
