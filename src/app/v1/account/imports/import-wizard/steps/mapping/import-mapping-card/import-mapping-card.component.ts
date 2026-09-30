import { DragDropModule } from '@angular/cdk/drag-drop';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import {
  ImportMappingCardView,
  ImportMappingDestinationView,
  UNMAPPED_FACILITY_TARGET
} from '../../../import-mapping.models';

@Component({
  selector: 'app-import-mapping-card',
  standalone: true,
  imports: [DragDropModule, IconComponent],
  templateUrl: './import-mapping-card.component.html',
  styleUrls: ['../../../import-drag-board.shared.css', './import-mapping-card.component.css']
})
export class ImportMappingCardComponent {
  @Input({ required: true }) card!: ImportMappingCardView;
  @Input() destinations: readonly ImportMappingDestinationView[] = [];
  @Input() selected = false;
  @Output() selectedChange = new EventEmitter<boolean>();
  @Output() moveRequested = new EventEmitter<string | undefined>();

  readonly unmappedTarget = UNMAPPED_FACILITY_TARGET;

  destinationValue(destination: ImportMappingDestinationView): string {
    return destination.facilityId ?? this.unmappedTarget;
  }

  move(value: string): void {
    if (!value) return;
    this.moveRequested.emit(value === this.unmappedTarget ? undefined : value);
  }
}
