import { Component, inject } from '@angular/core';
import { WorkspaceNavigationService } from '../workspace-navigation.service';

const ACCOUNT_SETTINGS_ITEMS = [
  { id: 'profile', label: 'Profile', icon: 'fa-building' },
  { id: 'units', label: 'Units', icon: 'fa-ruler-combined' },
  { id: 'goals', label: 'Goals', icon: 'fa-bullseye' },
  { id: 'financial', label: 'Financial', icon: 'fa-calendar-days' },
  { id: 'staleness', label: 'Staleness', icon: 'fa-clock' },
  { id: 'backup', label: 'Backup', icon: 'fa-file-arrow-down' }
] as const;

@Component({
  selector: 'app-section-nav',
  templateUrl: './section-nav.component.html',
  styleUrls: ['./section-nav.component.css'],
  standalone: false
})
export class SectionNavComponent {
  readonly navigation = inject(WorkspaceNavigationService);
  readonly settingsItems = ACCOUNT_SETTINGS_ITEMS;
}
