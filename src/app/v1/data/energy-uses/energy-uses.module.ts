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
    InventoryPlaceholderComponent,
    EnergyUsesPlaceholderComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InventoryGridComponent,
    BrowsePositionDirective,
    IconsModule,
    DataEmptyStateModule
  ],
  exports: [
    EnergyUsesInventoryComponent,
    InventoryPlaceholderComponent,
    EnergyUsesPlaceholderComponent
  ],
})
export class EnergyUsesModule {}
