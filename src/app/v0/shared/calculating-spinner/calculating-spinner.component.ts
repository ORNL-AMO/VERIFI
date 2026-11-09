import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
    selector: 'app-calculating-spinner',
    templateUrl: './calculating-spinner.component.html',
    styleUrls: ['./calculating-spinner.component.css'],
    standalone: false
})
export class CalculatingSpinnerComponent {
  @Input()
  message: string;
  @Input()
  error: boolean;
  @Input()
  retryable: boolean = false;
  @Output()
  retry: EventEmitter<void> = new EventEmitter<void>();

}
