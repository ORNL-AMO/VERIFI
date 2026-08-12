import { Component, Input } from '@angular/core';
import type { P1FacilitySettingsPageComponent } from '../facility-settings-page.component';

@Component({
  selector: 'app-p1-facility-settings-financial',
  templateUrl: './facility-settings-financial.component.html',
  styleUrls: [
    '../../account-settings-page/account-settings-page.component.css',
    '../facility-settings-page.component.css'
  ],
  standalone: false
})
export class P1FacilitySettingsFinancialComponent {
  @Input({ required: true }) page: P1FacilitySettingsPageComponent;
}
