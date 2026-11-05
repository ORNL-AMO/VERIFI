import { Component, computed, inject } from '@angular/core';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { PageBreadcrumb } from '@app/v1/shared/page-identity/page-identity.component';
import { facilityContextBreadcrumbs } from '@app/v1/shared/page-identity/facility-context-breadcrumbs';
import { DataWorkbenchTab } from '@app/v1/shared/data-workbench/data-workbench-tabs.component';
import { EnergyUseWorkbenchHeaderService } from './energy-use-workbench-header.service';
import { energyUseSetup, energyUseSetupValidation } from '../models/energy-use-setup.models';
import { EnergyUsesWorkspaceService } from '../energy-uses-workspace.service';
import { EnergyUseWorkbenchContextService } from './energy-use-workbench-context.service';

@Component({
  selector: 'app-energy-use-workbench',
  templateUrl: './energy-use-workbench.component.html',
  styleUrls: ['./energy-use-workbench.component.css'],
  standalone: false,
  providers: [EnergyUsesWorkspaceService, EnergyUseWorkbenchContextService, EnergyUseWorkbenchHeaderService]
})
export class EnergyUseWorkbenchComponent {
  readonly context = inject(EnergyUseWorkbenchContextService);
  private readonly header = inject(EnergyUseWorkbenchHeaderService);
  readonly editor = computed(() => {
    const entry = this.context.entry(), account = this.context.workspace.account(), editor = this.header.editor();
    return entry && account && editor?.key() === `${account.guid}:${entry.facility.guid}:${entry.guid}` ? editor : undefined;
  });
  readonly validation = computed(() => {
    const editor = this.editor(), entry = this.context.entry();
    return editor ? editor.validation() : entry ? energyUseSetupValidation(energyUseSetup(entry.item), entry.item) : undefined;
  });
  readonly saveFeedback = computed(() => {
    const editor = this.editor();
    if (!editor) return undefined;
    const state = editor.state();
    return { state, label: state === 'saving' ? 'Saving…' : state === 'error' ? 'Save failed' : state === 'invalid' ? 'Check inputs'
      : state === 'conflict' ? 'Review conflicts' : state === 'dirty' ? 'Unsaved changes' : state === 'saved' ? 'Saved' : 'Changes save automatically',
      icon: state === 'saving' ? 'loading' as const : ['error', 'invalid', 'conflict'].includes(state) ? 'warning' as const : state === 'saved' ? 'check' as const : 'info' as const,
      tone: ['error', 'invalid', 'conflict'].includes(state) ? 'warning' : state === 'saved' ? 'success' : 'info',
      detail: ['error', 'invalid', 'conflict'].includes(state) ? editor.message() : '' };
  });
  readonly navigation = inject(WorkspaceNavigationService);
  readonly tabs: readonly DataWorkbenchTab[] = [
    { id: 'settings', label: 'Setup', icon: 'settings' }
  ];
  readonly breadcrumbs = computed<readonly PageBreadcrumb[]>(() => {
    const account = this.context.workspace.account();
    const entry = this.context.entry();
    const group = this.context.group();
    return account && entry ? [...facilityContextBreadcrumbs(this.navigation.isSingleSiteWorkspace(),
      { label: account.name, route: this.navigation.accountPortfolioRoute(account.guid, 'energy-uses') },
      { label: entry.facility.name, ...this.context.inventoryLink() },
      { label: 'Energy Uses', icon: 'tools', ...this.context.inventoryLink() }
    ), ...(group ? [{ label: group.name, icon: 'energyUseGroup' as const, ...this.context.groupLink() }] : [])] : [];
  });
}
