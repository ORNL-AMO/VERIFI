import { Component, Input } from '@angular/core';
import type { P1AccountSettingsPageComponent } from '../account-settings-page.component';

@Component({
  selector: 'app-p1-account-settings-financial',
  templateUrl: './account-settings-financial.component.html',
  styleUrls: ['../account-settings-page.component.css'],
  host: { style: 'display: block;' },
  standalone: false
})
export class P1AccountSettingsFinancialComponent {
  @Input({ required: true }) page: P1AccountSettingsPageComponent;
}
