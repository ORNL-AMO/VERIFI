import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AccountPortfolioComponent } from './account-portfolio.component';
import { CreateFacilityDrawerComponent } from './create-facility-drawer/create-facility-drawer.component';

@NgModule({
  declarations: [
    AccountPortfolioComponent,
    CreateFacilityDrawerComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule
  ],
  exports: [
    AccountPortfolioComponent,
    CreateFacilityDrawerComponent
  ]
})
export class AccountPortfolioModule { }
