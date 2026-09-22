import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IconsModule } from '@app/v1/shared/icons/icons.module';
import { MeterBrowseCardComponent } from '@app/v1/facility/data/meters/meters-dashboard/meter-browse-card/meter-browse-card.component';
import { PredictorBrowseCardComponent } from '@app/v1/facility/data/predictors/predictors-dashboard/predictor-browse-card/predictor-browse-card.component';
import { DataEmptyStateModule } from '@app/v1/shared/data-empty-state/data-empty-state.module';
import { WorkspaceSlideoutComponent } from '@app/v1/shared/workspace-slideout/workspace-slideout.component';
import { DrawerFocusTrapDirective } from '@app/v1/welcome/shared/drawer-focus-trap.directive';

import { CustomGridFactorFormComponent } from './custom-grid-factors/custom-grid-factor-form/custom-grid-factor-form.component';
import { CustomGridFactorsComponent } from './custom-grid-factors/custom-grid-factors.component';
import { GridFactorRateListComponent } from './custom-grid-factors/grid-factor-rate-list/grid-factor-rate-list.component';
import { CustomFuelFormComponent } from './custom-fuels/custom-fuel-form/custom-fuel-form.component';
import { CustomFuelsComponent } from './custom-fuels/custom-fuels.component';
import { ExistingFuelPickerComponent } from './custom-fuels/existing-fuel-picker/existing-fuel-picker.component';
import { CustomGwpFormComponent } from './custom-gwps/custom-gwp-form/custom-gwp-form.component';
import { CustomGwpsComponent } from './custom-gwps/custom-gwps.component';
import { ExistingGwpPickerComponent } from './custom-gwps/existing-gwp-picker/existing-gwp-picker.component';
import { AccountPortfolioAnalysesTabComponent } from './portfolio/account-portfolio-analyses-tab/account-portfolio-analyses-tab.component';
import { AccountPortfolioEnergyUsesTabComponent } from './portfolio/account-portfolio-energy-uses-tab/account-portfolio-energy-uses-tab.component';
import { AccountPortfolioFacilitiesTabComponent } from './portfolio/account-portfolio-facilities-tab/account-portfolio-facilities-tab.component';
import { AccountPortfolioMetersTabComponent } from './portfolio/account-portfolio-meters-tab/account-portfolio-meters-tab.component';
import { AccountPortfolioPlaceholderTabComponent } from './portfolio/account-portfolio-placeholder-tab/account-portfolio-placeholder-tab.component';
import { AccountPortfolioPredictorsTabComponent } from './portfolio/account-portfolio-predictors-tab/account-portfolio-predictors-tab.component';
import { AccountPortfolioReportsTabComponent } from './portfolio/account-portfolio-reports-tab/account-portfolio-reports-tab.component';
import { AccountPortfolioComponent } from './portfolio/account-portfolio.component';
import { CreateFacilityDrawerComponent } from './portfolio/create-facility-drawer/create-facility-drawer.component';

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
    AccountPortfolioMetersTabComponent,
    AccountPortfolioPlaceholderTabComponent,
    AccountPortfolioPredictorsTabComponent,
    AccountPortfolioEnergyUsesTabComponent,
    AccountPortfolioAnalysesTabComponent,
    AccountPortfolioReportsTabComponent,
    CreateFacilityDrawerComponent
  ],
  imports: [
    CommonModule,
    IconsModule,
    ReactiveFormsModule,
    RouterModule,
    DataEmptyStateModule,
    WorkspaceSlideoutComponent,
    DrawerFocusTrapDirective,
    MeterBrowseCardComponent,
    PredictorBrowseCardComponent
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
