import { NgModule } from '@angular/core';
import { CustomGridFactorsComponent } from './custom-grid-factors/custom-grid-factors.component';
import { CustomGridFactorFormComponent } from './custom-grid-factors/custom-grid-factor-form/custom-grid-factor-form.component';
import { GridFactorRateListComponent } from './custom-grid-factors/grid-factor-rate-list/grid-factor-rate-list.component';
import { CustomFuelsComponent } from './custom-fuels/custom-fuels.component';
import { CustomFuelFormComponent } from './custom-fuels/custom-fuel-form/custom-fuel-form.component';
import { ExistingFuelPickerComponent } from './custom-fuels/existing-fuel-picker/existing-fuel-picker.component';
import { CustomGwpsComponent } from './custom-gwps/custom-gwps.component';
import { CustomGwpFormComponent } from './custom-gwps/custom-gwp-form/custom-gwp-form.component';
import { ExistingGwpPickerComponent } from './custom-gwps/existing-gwp-picker/existing-gwp-picker.component';
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

@NgModule({
  declarations: [
    CustomGridFactorsComponent,
    CustomGridFactorFormComponent,
    GridFactorRateListComponent,
    CustomFuelsComponent,
    CustomFuelFormComponent,
    ExistingFuelPickerComponent,
    CustomGwpsComponent,
    CustomGwpFormComponent,
    ExistingGwpPickerComponent
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
    ModalFocusTrapDirective
  ],
  exports: [
    CustomGridFactorsComponent,
    CustomGridFactorFormComponent,
    GridFactorRateListComponent,
    CustomFuelsComponent,
    CustomFuelFormComponent,
    ExistingFuelPickerComponent,
    CustomGwpsComponent,
    CustomGwpFormComponent,
    ExistingGwpPickerComponent
  ],
})
export class CustomDatabaseModule {}
