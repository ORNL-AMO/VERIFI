import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';

@Component({
  selector: 'app-confirm-delete-group-modal',
  templateUrl: './confirm-delete-group-modal.component.html',
  styleUrls: ['./confirm-delete-group-modal.component.css'],
  standalone: true
})
export class ConfirmDeleteGroupModalComponent {
  @Input({ required: true }) group!: IdbUtilityMeterGroup;
  @Input() assignedMeterCount = 0;
  @Input() saving = false;
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();
}
