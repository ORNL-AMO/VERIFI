import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IconsModule } from '@app/v1/shared/icons/icons.module';
import { AccountPortfolioComponent } from './account-portfolio.component';
import { CreateFacilityDrawerComponent } from '../create-facility-drawer/create-facility-drawer.component';
import { DrawerFocusTrapDirective } from '../../welcome/shared/drawer-focus-trap.directive';

@NgModule({
  declarations: [
    AccountPortfolioComponent,
    CreateFacilityDrawerComponent
  ],
  imports: [
    CommonModule,
    IconsModule,
    ReactiveFormsModule,
    DrawerFocusTrapDirective,
    RouterModule
  ],
  exports: [
    AccountPortfolioComponent,
    CreateFacilityDrawerComponent
  ]
})
export class AccountPortfolioModule { }
