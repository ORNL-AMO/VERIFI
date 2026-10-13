import { Component, input } from '@angular/core';
import type { StatusEvaluationState } from '@app/v1/status/status.models';

@Component({
  selector: 'app-status-evaluation-message',
  standalone: true,
  templateUrl: './status-evaluation-message.component.html',
  styleUrls: ['./status-evaluation-message.component.css']
})
export class StatusEvaluationMessageComponent {
  readonly state = input.required<StatusEvaluationState>();
  readonly compact = input(false);
}
