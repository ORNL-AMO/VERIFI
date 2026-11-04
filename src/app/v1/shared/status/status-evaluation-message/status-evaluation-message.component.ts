import { Component, computed, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { map, of, startWith, switchMap, timer } from 'rxjs';
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
  private readonly checking = computed(() => this.compact() && (this.state() === 'idle' || this.state() === 'evaluating'));
  readonly showChecking = toSignal(toObservable(this.checking).pipe(
    switchMap(checking => checking ? timer(300).pipe(map(() => true), startWith(false)) : of(false))
  ), { initialValue: false });
}
