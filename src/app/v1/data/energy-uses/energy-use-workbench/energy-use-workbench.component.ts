import { Component, computed, inject } from '@angular/core';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { PageBreadcrumb } from '@app/v1/shared/page-identity/page-identity.component';
import { facilityContextBreadcrumbs } from '@app/v1/shared/page-identity/facility-context-breadcrumbs';
import { DataWorkbenchTab } from '@app/v1/shared/data-workbench/data-workbench-tabs.component';
import { EnergyUsesWorkspaceService } from '../energy-uses-workspace.service';
import { EnergyUseWorkbenchContextService } from './energy-use-workbench-context.service';

@Component({
  selector: 'app-energy-use-workbench',
  templateUrl: './energy-use-workbench.component.html',
  styleUrls: ['./energy-use-workbench.component.css'],
  standalone: false,
  providers: [EnergyUsesWorkspaceService, EnergyUseWorkbenchContextService]
})
export class EnergyUseWorkbenchComponent {
  readonly context = inject(EnergyUseWorkbenchContextService);
  readonly navigation = inject(WorkspaceNavigationService);
  readonly tabs: readonly DataWorkbenchTab[] = [
    { id: 'settings', label: 'Settings', icon: 'settings' },
    { id: 'annual-data', label: 'Annual Data', icon: 'table' }
  ];
  readonly breadcrumbs = computed<readonly PageBreadcrumb[]>(() => {
    const account = this.context.workspace.account();
    const entry = this.context.entry();
    return account && entry ? facilityContextBreadcrumbs(this.navigation.isSingleSiteWorkspace(),
      { label: account.name, route: this.navigation.accountPortfolioRoute(account.guid, 'energy-uses') },
      { label: entry.facility.name, ...this.context.inventoryLink() },
      { label: 'Energy Uses', icon: 'tools', ...this.context.inventoryLink() }
    ) : [];
  });
}
