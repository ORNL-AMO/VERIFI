import { Component, inject } from '@angular/core';
import { DataValidationSettingsEditor } from '@app/v1/shared/settings/data-validation-settings-editor.service';

@Component({
  selector: 'app-facility-settings-data-validation',
  templateUrl: './facility-settings-data-validation.component.html',
  styleUrls: ['./facility-settings-data-validation.component.css'],
  providers: [DataValidationSettingsEditor],
  standalone: false
})
export class FacilitySettingsDataValidationComponent {
  readonly editor = inject(DataValidationSettingsEditor);

  constructor() { this.editor.initialize(true); }

  hasUnsavedChanges(): boolean { return this.editor.hasUnsavedChanges(); }

  isNavigationBlocked(): boolean { return this.editor.isNavigationBlocked(); }
}
