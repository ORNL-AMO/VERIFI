import { Component, computed, inject } from '@angular/core';
import { WorkspaceNavigationService } from '../workspace-navigation.service';
import { SectionNavDisclosureService } from './section-nav-disclosure.service';

@Component({
  selector: 'app-section-nav',
  templateUrl: './section-nav.component.html',
  styleUrls: ['./section-nav.component.css'],
  providers: [SectionNavDisclosureService],
  standalone: false
})
export class SectionNavComponent {
  readonly navigation = inject(WorkspaceNavigationService);
  readonly homeTitle = computed(() => this.navigation.contextMode() === 'facility' ? 'Facility Home' : 'Account Home');
}
