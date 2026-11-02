import { NgModule } from '@angular/core';
import { DataInventoryComponent } from './inventory/data-inventory.component';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IconsModule } from '@app/v1/shared/icons/icons.module';
import { DataEmptyStateModule } from '@app/v1/shared/data-empty-state/data-empty-state.module';
import { InventoryGridComponent } from '@app/v1/shared/inventory/inventory-grid/inventory-grid.component';
import { PageIdentityComponent } from '@app/v1/shared/page-identity/page-identity.component';
import { BrowseHeaderDirective } from '@app/v1/shared/navigation/browse-header/browse-header.directive';
import { BrowsePositionDirective } from '@app/v1/shared/navigation/browse-state/browse-position.directive';
import { WorkspaceSlideoutComponent } from '@app/v1/shared/workspace-slideout/workspace-slideout.component';
import { ModalFocusTrapDirective } from '@app/v1/shared/a11y/modal-focus-trap.directive';
import { FacilitiesModule } from './facilities/facilities.module';
import { MetersModule } from './meters/meters.module';
import { PredictorsModule } from './predictors/predictors.module';
import { EnergyUsesModule } from './energy-uses/energy-uses.module';
import { CustomDatabaseModule } from './custom-database/custom-database.module';

@NgModule({
  declarations: [
    DataInventoryComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    IconsModule,
    DataEmptyStateModule,
    InventoryGridComponent,
    PageIdentityComponent,
    BrowseHeaderDirective,
    BrowsePositionDirective,
    WorkspaceSlideoutComponent,
    ModalFocusTrapDirective,
    FacilitiesModule,
    MetersModule,
    PredictorsModule,
    EnergyUsesModule,
    CustomDatabaseModule
  ],
  exports: [
    DataInventoryComponent,
    FacilitiesModule,
    MetersModule,
    PredictorsModule,
    EnergyUsesModule,
    CustomDatabaseModule
  ],
})
export class DataModule {}
