import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { IconComponent } from '../icons/icon.component';
import {
  DEFAULT_RESOURCE_BROWSE_CARD_CAPABILITIES,
  ResourceBrowseCardAction,
  ResourceBrowseCardCapabilities,
  ResourceBrowseCardView
} from './resource-browse-card.models';

@Component({
  selector: 'app-resource-browse-card',
  templateUrl: './resource-browse-card.component.html',
  styleUrls: ['./resource-browse-card.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [IconComponent]
})
export class ResourceBrowseCardComponent {
  @Input({ required: true }) view!: ResourceBrowseCardView;
  @Input() actions: ReadonlyArray<ResourceBrowseCardAction> = [];
  @Input() capabilities: ResourceBrowseCardCapabilities = DEFAULT_RESOURCE_BROWSE_CARD_CAPABILITIES;

  @Output() readonly opened = new EventEmitter<void>();
  @Output() readonly actionSelected = new EventEmitter<string>();

  selectAction(action: ResourceBrowseCardAction): void {
    if (!action.disabled && !action.loading) {
      this.actionSelected.emit(action.id);
    }
  }
}
