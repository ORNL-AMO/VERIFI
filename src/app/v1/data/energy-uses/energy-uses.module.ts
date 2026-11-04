import { RouterModule } from '@angular/router';
import { PageIdentityComponent } from '@app/v1/shared/page-identity/page-identity.component';
import { BrowseHeaderDirective } from '@app/v1/shared/navigation/browse-header/browse-header.directive';
import { DataWorkbenchTabsComponent } from '@app/v1/shared/data-workbench/data-workbench-tabs.component';
import { DataWorkbenchResourceSwitcherComponent } from '@app/v1/shared/data-workbench/data-workbench-resource-switcher.component';
import { EnergyUseWorkbenchComponent } from './energy-use-workbench/energy-use-workbench.component';
import { EnergyUseWorkbenchPanelComponent } from './energy-use-workbench/panel/energy-use-workbench-panel.component';
import { NgModule } from '@angular/core';
import { EnergyUsesInventoryComponent } from './inventory/energy-uses-inventory.component';
import { InventoryPlaceholderComponent } from './inventory-placeholder/inventory-placeholder.component';
import { EnergyUsesPlaceholderComponent } from './energy-uses-placeholder/energy-uses-placeholder.component';
import { ReactiveFormsModule } from '@angular/forms';
import { InventoryGridComponent } from '@app/v1/shared/inventory/inventory-grid/inventory-grid.component';
import { BrowsePositionDirective } from '@app/v1/shared/navigation/browse-state/browse-position.directive';
import { CommonModule } from '@angular/common';
import { IconsModule } from '@app/v1/shared/icons/icons.module';
import { DataEmptyStateModule } from '@app/v1/shared/data-empty-state/data-empty-state.module';

@NgModule({
  declarations: [
    EnergyUsesInventoryComponent,
    EnergyUseWorkbenchComponent,
    EnergyUseWorkbenchPanelComponent,
    InventoryPlaceholderComponent,
    EnergyUsesPlaceholderComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    PageIdentityComponent,
    BrowseHeaderDirective,
    DataWorkbenchTabsComponent,
    DataWorkbenchResourceSwitcherComponent,
    ReactiveFormsModule,
    InventoryGridComponent,
    BrowsePositionDirective,
    IconsModule,
    DataEmptyStateModule
  ],
  exports: [
    EnergyUsesInventoryComponent,
    EnergyUseWorkbenchComponent,
    EnergyUseWorkbenchPanelComponent,
    InventoryPlaceholderComponent,
    EnergyUsesPlaceholderComponent
  ],
})
export class EnergyUsesModule {}
