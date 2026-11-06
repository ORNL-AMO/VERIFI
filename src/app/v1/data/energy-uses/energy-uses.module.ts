import { RouterModule } from '@angular/router';
import { PageIdentityComponent } from '@app/v1/shared/page-identity/page-identity.component';
import { BrowseHeaderDirective } from '@app/v1/shared/navigation/browse-header/browse-header.directive';
import { DataWorkbenchTabsComponent } from '@app/v1/shared/data-workbench/data-workbench-tabs.component';
import { DataWorkbenchResourceSwitcherComponent } from '@app/v1/shared/data-workbench/data-workbench-resource-switcher.component';
import { EnergyUseWorkbenchComponent } from './energy-use-workbench/energy-use-workbench.component';
import { AnnualDataFieldsComponent } from './forms/annual-data-fields/annual-data-fields.component';
import { NgModule } from '@angular/core';
import { SettingsFieldsComponent } from './forms/settings-fields/settings-fields.component';
import { UtilitiesSlideoutComponent } from './forms/utilities-slideout/utilities-slideout.component';
import { MeterGroupsSlideoutComponent } from './forms/meter-groups-slideout/meter-groups-slideout.component';
import { CreateEnergyUseDrawerComponent } from './create-energy-use-drawer/create-energy-use-drawer.component';
import { EnergyUseSettingsComponent } from './energy-use-workbench/settings/energy-use-settings.component';
import { WorkspaceSlideoutComponent } from '@app/v1/shared/workspace-slideout/workspace-slideout.component';
import { ConfirmationDialogComponent } from '@app/v1/shared/a11y/confirmation-dialog.component';
import { EditorConflictReviewComponent } from '@app/v1/data/editing/editor-conflict-review/editor-conflict-review.component';
import { EnergyUsesInventoryComponent } from './inventory/energy-uses-inventory.component';
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
    AnnualDataFieldsComponent,
    SettingsFieldsComponent, UtilitiesSlideoutComponent, MeterGroupsSlideoutComponent, CreateEnergyUseDrawerComponent, EnergyUseSettingsComponent,
  ],
  imports: [
    CommonModule,
    WorkspaceSlideoutComponent, ConfirmationDialogComponent, EditorConflictReviewComponent,
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
    AnnualDataFieldsComponent,
  ],
})
export class EnergyUsesModule {}
