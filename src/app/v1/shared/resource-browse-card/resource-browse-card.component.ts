import { booleanAttribute, ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { IconComponent } from '../icons/icon.component';
import {
  ResourceBrowseCardAction,
  ResourceBrowseCardView
} from './resource-browse-card.models';

let nextResourceBrowseCardId = 0;

@Component({
  selector: 'app-resource-browse-card',
  templateUrl: './resource-browse-card.component.html',
  styleUrls: ['./resource-browse-card.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [IconComponent]
})
export class ResourceBrowseCardComponent {
  readonly idPrefix = `v1-resource-browse-card-${++nextResourceBrowseCardId}`;
  @Input({ required: true }) view!: ResourceBrowseCardView;
  @Input() actions: ReadonlyArray<ResourceBrowseCardAction> = [];
  @Input({ transform: booleanAttribute }) canOpen = true;
  @Input({ transform: booleanAttribute }) readOnly = false;

  @Output() readonly opened = new EventEmitter<void>();
  @Output() readonly actionSelected = new EventEmitter<string>();

  selectAction(action: ResourceBrowseCardAction): void {
    if (!action.disabled && !action.loading) {
      this.actionSelected.emit(action.id);
    }
  }
}
