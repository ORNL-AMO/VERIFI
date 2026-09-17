import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IconsModule } from '@app/v1/shared/icons/icons.module';
import { MeterBrowseCardComponent } from '@app/v1/facility/data/meters/meters-dashboard/meter-browse-card/meter-browse-card.component';
import { AccountPortfolioComponent } from './account-portfolio.component';
import { AccountPortfolioAnalysesTabComponent } from './account-portfolio-analyses-tab/account-portfolio-analyses-tab.component';
import { AccountPortfolioEnergyUsesTabComponent } from './account-portfolio-energy-uses-tab/account-portfolio-energy-uses-tab.component';
import { AccountPortfolioFacilitiesTabComponent } from './account-portfolio-facilities-tab/account-portfolio-facilities-tab.component';
import { AccountPortfolioMetersTabComponent } from './account-portfolio-meters-tab/account-portfolio-meters-tab.component';
import { AccountPortfolioPlaceholderTabComponent } from './account-portfolio-placeholder-tab/account-portfolio-placeholder-tab.component';
import { AccountPortfolioPredictorsTabComponent } from './account-portfolio-predictors-tab/account-portfolio-predictors-tab.component';
import { AccountPortfolioReportsTabComponent } from './account-portfolio-reports-tab/account-portfolio-reports-tab.component';
import { CreateFacilityDrawerComponent } from '@app/v1/account/create-facility-drawer/create-facility-drawer.component';
import { DrawerFocusTrapDirective } from '@app/v1/welcome/shared/drawer-focus-trap.directive';

@NgModule({
  declarations: [
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
    DrawerFocusTrapDirective,
    MeterBrowseCardComponent,
    RouterModule
  ],
  exports: [
    AccountPortfolioComponent,
    CreateFacilityDrawerComponent
  ]
})
export class AccountPortfolioModule { }
