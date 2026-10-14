import { Component, inject } from '@angular/core';
import { DataValidationSettingsEditor } from '@app/v1/shared/settings/data-validation-settings-editor.service';

@Component({
  selector: 'app-account-settings-data-validation',
  templateUrl: './account-settings-data-validation.component.html',
  styleUrls: ['./account-settings-data-validation.component.css'],
  providers: [DataValidationSettingsEditor],
  standalone: false
})
export class AccountSettingsDataValidationComponent {
  readonly editor = inject(DataValidationSettingsEditor);

  constructor() { this.editor.initialize(false); }

  hasUnsavedChanges(): boolean { return this.editor.hasUnsavedChanges(); }

  isNavigationBlocked(): boolean { return this.editor.isNavigationBlocked(); }
}
