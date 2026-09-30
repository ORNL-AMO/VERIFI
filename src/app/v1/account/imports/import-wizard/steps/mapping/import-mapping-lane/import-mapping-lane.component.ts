import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import {
  importMappingDropListId,
  ImportMappingDestinationView,
  ImportMappingLaneView,
  ImportMappingType
} from '../../../import-mapping.models';
import { ImportMappingCardComponent } from '../import-mapping-card/import-mapping-card.component';

@Component({
  selector: 'app-import-mapping-lane',
  standalone: true,
  imports: [DragDropModule, IconComponent, ImportMappingCardComponent],
  templateUrl: './import-mapping-lane.component.html',
  styleUrls: ['../../../import-drag-board.shared.css', './import-mapping-lane.component.css']
})
export class ImportMappingLaneComponent {
  @Input({ required: true }) type!: ImportMappingType;
  @Input({ required: true }) lane!: ImportMappingLaneView;
  @Input() destinations: readonly ImportMappingDestinationView[] = [];
  @Input() connectedDropListIds: string[] = [];
  @Input() selectedIds: readonly string[] = [];
  @Input() selectedCount = 0;
  @Output() itemDropped = new EventEmitter<{ itemId: string; facilityId?: string }>();
  @Output() selectionChanged = new EventEmitter<{ itemId: string; selected: boolean }>();
  @Output() moveSelectedRequested = new EventEmitter<string | undefined>();
  @Output() moveRequested = new EventEmitter<{ itemId: string; facilityId?: string }>();

  get dropListId(): string {
    return importMappingDropListId(this.type, this.lane.id);
  }

  selected(itemId: string): boolean {
    return this.selectedIds.includes(itemId);
  }

  drop(event: CdkDragDrop<readonly unknown[]>): void {
    if (event.previousContainer === event.container) return;
    this.itemDropped.emit({ itemId: event.item.data.id, facilityId: this.lane.facilityId });
  }
}
