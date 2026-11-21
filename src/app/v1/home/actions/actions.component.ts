import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { Component, computed, inject, input, signal } from '@angular/core';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { HomeContext } from '../home-context.service';
import { HomePrintState } from '../home-print-state.service';

@Component({ selector: 'app-home-actions', standalone: false, templateUrl: './actions.component.html', styleUrl: './actions.component.css' })
export class HomeActionsComponent {
  readonly active = input(true);
  readonly navigation = inject(WorkspaceNavigationService);
  readonly home = inject(HomeContext);
  readonly status = inject(WorkspaceStatusService);
  readonly printing = inject(HomePrintState);
  readonly requestedPage = signal(1);
  readonly items = computed(() => {
    const owner = this.home.owner(), account = this.home.workspace.account();
    if (!owner || this.status.state() !== 'ready' || this.status.evaluation()?.accountGuid !== account?.guid) return [];
    const matches = this.status.accountTodos().filter(item => item.entity.accountGuid === account.guid
      && (owner.kind === 'account' || item.entity.facilityGuid === owner.guid));
    return [...matches.filter(item => item.severity === 'error'), ...matches.filter(item => item.severity === 'warning')];
  });
  readonly page = computed(() => Math.min(Math.max(1, Math.ceil(this.items().length / 24)), this.requestedPage()));
  readonly visible = computed(() => this.printing.active() ? this.items() : this.items().slice((this.page() - 1) * 24, this.page() * 24));
}
