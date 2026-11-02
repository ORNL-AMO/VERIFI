import { NgModule } from '@angular/core';
import { EnergyUsesInventoryComponent } from './inventory/energy-uses-inventory.component';
import { InventoryPlaceholderComponent } from './inventory-placeholder/inventory-placeholder.component';
import { EnergyUsesPlaceholderComponent } from './energy-uses-placeholder/energy-uses-placeholder.component';
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
