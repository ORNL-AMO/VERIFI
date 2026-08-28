import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AccountPortfolioComponent } from './account-portfolio.component';

@NgModule({
  declarations: [
    AccountPortfolioComponent
  ],
  imports: [
    CommonModule,
    RouterModule
  ],
  exports: [AccountPortfolioComponent]
})
export class AccountPortfolioModule { }
