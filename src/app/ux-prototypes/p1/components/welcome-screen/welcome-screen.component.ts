import { Component, inject } from '@angular/core';
import { P1AccountSummary } from '../../p1.models';
import { P1RouteFacade } from '../../p1-route.facade';

@Component({
  selector: 'app-p1-welcome-screen',
  templateUrl: './welcome-screen.component.html',
  styleUrls: ['./welcome-screen.component.css'],
  standalone: false
})
export class P1WelcomeScreenComponent {
  readonly facade = inject(P1RouteFacade);

  get recentAccount(): P1AccountSummary | undefined {
    const accounts = this.facade.accounts();
    return accounts.find(account => account.isActive) || accounts[0];
  }

  openRecentAccount(): void {
    const account = this.recentAccount;
    if (account) {
      void this.facade.openWorkspace(account.id);
    }
  }
}
