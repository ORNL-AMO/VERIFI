import { Component, inject } from '@angular/core';
import { WorkspaceNavigationService } from '../../shell/workspace-navigation.service';

@Component({
  selector: 'app-account-portfolio',
  templateUrl: './account-portfolio.component.html',
  styleUrls: ['./account-portfolio.component.css'],
  standalone: false
})
export class AccountPortfolioComponent {
  readonly navigation = inject(WorkspaceNavigationService);
}
