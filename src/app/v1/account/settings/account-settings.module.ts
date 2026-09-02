import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ImportAccountBackupComponent } from '../../welcome/import-account-backup/import-account-backup.component';
import { AccountSettingsComponent } from './account-settings.component';
import { AccountSettingsBackupComponent } from './backup/account-settings-backup.component';
import { AccountSettingsDeleteComponent } from './delete/account-settings-delete.component';
import { AccountSettingsFinancialComponent } from './financial/account-settings-financial.component';
import { AccountSettingsGoalsComponent } from './goals/account-settings-goals.component';
import { AccountSettingsPortfolioComponent } from './portfolio/account-settings-portfolio.component';
import { AccountSettingsProfileComponent } from './profile/account-settings-profile.component';
import { AccountSettingsStalenessComponent } from './staleness/account-settings-staleness.component';
import { AccountSettingsUnitsComponent } from './units/account-settings-units.component';
import { AccountPortfolioModule } from '../portfolio/account-portfolio.module';

@NgModule({
  declarations: [
    AccountSettingsComponent,
    AccountSettingsProfileComponent,
    AccountSettingsUnitsComponent,
    AccountSettingsGoalsComponent,
    AccountSettingsFinancialComponent,
    AccountSettingsStalenessComponent,
    AccountSettingsBackupComponent,
    AccountSettingsPortfolioComponent,
    AccountSettingsDeleteComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    AccountPortfolioModule,
    ImportAccountBackupComponent
  ],
  exports: [AccountSettingsComponent]
})
export class AccountSettingsModule { }
