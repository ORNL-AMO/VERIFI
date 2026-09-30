import { DragDropModule } from '@angular/cdk/drag-drop';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ColumnTarget } from '@data/import/spreadsheet-import.models';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { columnTargetLabel, ImportColumnCardView, IMPORT_COLUMN_TARGETS } from '../../../import-column.models';

@Component({
  selector: 'app-import-column-card',
  standalone: true,
  imports: [DragDropModule, FormsModule, IconComponent],
  templateUrl: './import-column-card.component.html',
  styleUrls: ['../../../import-drag-board.shared.css', './import-column-card.component.css']
})
export class ImportColumnCardComponent {
  @Input({ required: true }) card!: ImportColumnCardView;
  @Input() selected = false;
  @Output() selectedChange = new EventEmitter<boolean>();
  @Output() moveRequested = new EventEmitter<ColumnTarget>();

  readonly targets = IMPORT_COLUMN_TARGETS;

  targetLabel(target: ColumnTarget): string {
    return columnTargetLabel(target);
  }

  move(target: string): void {
    if (target) this.moveRequested.emit(target as ColumnTarget);
  }
}
