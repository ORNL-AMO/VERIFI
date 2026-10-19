import { PageIdentityComponent } from '@app/v1/shared/page-identity/page-identity.component';
import { BrowseHeaderDirective } from '@app/v1/shared/navigation/browse-header/browse-header.directive';
import { BrowsePositionDirective } from '@app/v1/shared/navigation/browse-state/browse-position.directive';
import { CreatePredictorDrawerComponent } from './portfolio/create-predictor-drawer/create-predictor-drawer.component';
import { CommonModule } from '@angular/common';
import { CdkMenuModule } from '@angular/cdk/menu';
import { PortfolioTileComponent } from './portfolio/portfolio-tile/portfolio-tile.component';
import { FacilitySnapshotComponent } from './portfolio/portfolio-tile/facility-snapshot/facility-snapshot.component';
import { PortfolioInventoryComponent } from './portfolio/portfolio-inventory/portfolio-inventory.component';
import { PortfolioGridDirective } from './portfolio/portfolio-inventory/portfolio-grid.directive';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IconsModule } from '@app/v1/shared/icons/icons.module';
import { MeterDraftSlideoutComponent } from '@app/v1/facility/data/meters/meters-dashboard/meter-dashboard-slideout/meter-draft-slideout/meter-draft-slideout.component';
import { DataEmptyStateModule } from '@app/v1/shared/data-empty-state/data-empty-state.module';
import { WorkspaceSlideoutComponent } from '@app/v1/shared/workspace-slideout/workspace-slideout.component';
import { ModalFocusTrapDirective } from '@app/v1/shared/a11y/modal-focus-trap.directive';

import { CustomGridFactorFormComponent } from './custom-grid-factors/custom-grid-factor-form/custom-grid-factor-form.component';
import { CustomGridFactorsComponent } from './custom-grid-factors/custom-grid-factors.component';
import { GridFactorRateListComponent } from './custom-grid-factors/grid-factor-rate-list/grid-factor-rate-list.component';
import { CustomFuelFormComponent } from './custom-fuels/custom-fuel-form/custom-fuel-form.component';
import { CustomFuelsComponent } from './custom-fuels/custom-fuels.component';
import { ExistingFuelPickerComponent } from './custom-fuels/existing-fuel-picker/existing-fuel-picker.component';
import { CustomGwpFormComponent } from './custom-gwps/custom-gwp-form/custom-gwp-form.component';
import { CustomGwpsComponent } from './custom-gwps/custom-gwps.component';
import { ExistingGwpPickerComponent } from './custom-gwps/existing-gwp-picker/existing-gwp-picker.component';
import { AccountPortfolioEnergyUsesTabComponent } from './portfolio/account-portfolio-energy-uses-tab/account-portfolio-energy-uses-tab.component';
import { AccountPortfolioFacilitiesTabComponent } from './portfolio/account-portfolio-facilities-tab/account-portfolio-facilities-tab.component';
import { AccountPortfolioMetersTabComponent } from './portfolio/account-portfolio-meters-tab/account-portfolio-meters-tab.component';
import { AccountPortfolioPlaceholderTabComponent } from './portfolio/account-portfolio-placeholder-tab/account-portfolio-placeholder-tab.component';
import { AccountPortfolioPredictorsTabComponent } from './portfolio/account-portfolio-predictors-tab/account-portfolio-predictors-tab.component';
import { AccountPortfolioComponent } from './portfolio/account-portfolio.component';
import { CreateFacilityDrawerComponent } from './portfolio/create-facility-drawer/create-facility-drawer.component';
import { CreateMeterDrawerComponent } from './portfolio/create-meter-drawer/create-meter-drawer.component';

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
    ExistingGwpPickerComponent,
    AccountPortfolioComponent,
    AccountPortfolioFacilitiesTabComponent,
    PortfolioTileComponent,
    FacilitySnapshotComponent,
    PortfolioInventoryComponent,
    AccountPortfolioMetersTabComponent,
    AccountPortfolioPlaceholderTabComponent,
    AccountPortfolioPredictorsTabComponent,
    AccountPortfolioEnergyUsesTabComponent,
    CreateFacilityDrawerComponent,
    CreateMeterDrawerComponent
  ],
  imports: [CdkMenuModule, PortfolioGridDirective, CreatePredictorDrawerComponent, PageIdentityComponent, BrowseHeaderDirective, BrowsePositionDirective,
    CommonModule,
    MeterDraftSlideoutComponent,
    IconsModule,
    ReactiveFormsModule,
    RouterModule,
    DataEmptyStateModule,
    WorkspaceSlideoutComponent,
    ModalFocusTrapDirective
  ],
  exports: [
    CustomGridFactorsComponent,
    CustomFuelsComponent,
    CustomGwpsComponent,
    AccountPortfolioComponent,
    CreateFacilityDrawerComponent
  ]
})
export class AccountDataModule { }
