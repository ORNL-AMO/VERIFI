import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ColumnTarget } from '@data/import/spreadsheet-import.models';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { ImportColumnLaneView } from '../../../import-column.models';
import { ImportColumnCardComponent } from '../import-column-card/import-column-card.component';

@Component({
  selector: 'app-import-column-lane',
  standalone: true,
  imports: [DragDropModule, IconComponent, ImportColumnCardComponent],
  templateUrl: './import-column-lane.component.html',
  styleUrls: ['../../../import-drag-board.shared.css', './import-column-lane.component.css']
})
export class ImportColumnLaneComponent {
  @Input({ required: true }) lane!: ImportColumnLaneView;
  @Input() connectedDropListIds: string[] = [];
  @Input() selectedIds: readonly string[] = [];
  @Input() selectedCount = 0;
  @Output() columnDropped = new EventEmitter<{ itemId: string; target: ColumnTarget }>();
  @Output() selectionChanged = new EventEmitter<{ itemId: string; selected: boolean }>();
  @Output() moveSelectedRequested = new EventEmitter<ColumnTarget>();
  @Output() moveRequested = new EventEmitter<{ itemId: string; target: ColumnTarget }>();

  get dropListId(): string {
    return `import-column-${this.lane.target.replace(/\s+/g, '-').toLocaleLowerCase()}`;
  }

  selected(itemId: string): boolean {
    return this.selectedIds.includes(itemId);
  }

  get canMoveSelectedHere(): boolean {
    return this.selectedCount > 0 && (this.lane.target !== 'Date' || this.selectedCount === 1);
  }

  drop(event: CdkDragDrop<readonly unknown[]>): void {
    if (event.previousContainer === event.container) return;
    this.columnDropped.emit({ itemId: event.item.data.id, target: this.lane.target });
  }
}
