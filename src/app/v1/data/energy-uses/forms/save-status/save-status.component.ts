import { Component, input, output } from '@angular/core';
import type { SettingsEditState } from '@app/v1/data/editing/settings-edit-session';

@Component({ selector: 'app-energy-use-save-status', standalone: false,
  templateUrl: './save-status.component.html', styleUrls: ['./save-status.component.css'] })
export class SaveStatusComponent {
  readonly state = input<SettingsEditState>('idle');
  readonly message = input('Changes save automatically.');
  readonly canRetry = input(false);
  readonly retryRequested = output<void>();
}
