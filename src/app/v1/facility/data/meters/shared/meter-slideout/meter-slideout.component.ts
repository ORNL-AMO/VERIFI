import { Component, EventEmitter, Input, Output } from '@angular/core';
import { WorkspaceSlideoutComponent } from '@app/v1/shared/workspace-slideout/workspace-slideout.component';

@Component({
  selector: 'app-meter-slideout',
  templateUrl: './meter-slideout.component.html',
  styleUrls: ['./meter-slideout.component.css'],
  standalone: true,
  imports: [WorkspaceSlideoutComponent]
})
export class MeterSlideoutComponent {
  @Input({ required: true }) title = '';
  @Input() description = '';
  @Input() saving = false;
  @Input() size: 'default' | 'large' = 'default';
  @Output() closed = new EventEmitter<void>();
}
