import { Component, computed, inject } from '@angular/core';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { PageBreadcrumb } from '@app/v1/shared/page-identity/page-identity.component';
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
    const inventory = { label: 'Energy Uses', icon: 'tools' as const, ...this.context.inventoryLink() };
    return this.navigation.isSingleSiteWorkspace() ? [inventory] : [
      ...(account ? [{ label: account.name, route: this.navigation.accountPortfolioRoute(account.guid, 'energy-uses') }] : []),
      ...(entry ? [{ label: entry.facility.name, ...this.context.inventoryLink() }] : []), inventory
    ];
  });
}
