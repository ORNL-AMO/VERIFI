import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { IconComponent } from '@app/v1/shared/icons/icon.component';

@Component({
  selector: 'app-confirm-delete-group-modal',
  templateUrl: './confirm-delete-group-modal.component.html',
  styleUrls: ['./confirm-delete-group-modal.component.css'],
  standalone: true,
  imports: [IconComponent]
})
export class ConfirmDeleteGroupModalComponent {
  @Input({ required: true }) group!: IdbUtilityMeterGroup;
  @Input() assignedMeterCount = 0;
  @Input() saving = false;
  @Input() error?: string;
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();
}
