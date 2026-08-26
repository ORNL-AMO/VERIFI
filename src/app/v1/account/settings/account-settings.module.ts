import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ImportAccountBackupComponent } from '../../welcome/import-account-backup/import-account-backup.component';
import { AccountSettingsComponent } from './account-settings.component';
import { AccountSettingsBackupComponent } from './backup/account-settings-backup.component';
import { AccountSettingsFinancialComponent } from './financial/account-settings-financial.component';
import { AccountSettingsGoalsComponent } from './goals/account-settings-goals.component';
import { AccountSettingsProfileComponent } from './profile/account-settings-profile.component';
import { AccountSettingsStalenessComponent } from './staleness/account-settings-staleness.component';
import { AccountSettingsUnitsComponent } from './units/account-settings-units.component';

@NgModule({
  declarations: [
    AccountSettingsComponent,
    AccountSettingsProfileComponent,
    AccountSettingsUnitsComponent,
    AccountSettingsGoalsComponent,
    AccountSettingsFinancialComponent,
    AccountSettingsStalenessComponent,
    AccountSettingsBackupComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    ImportAccountBackupComponent
  ],
  exports: [AccountSettingsComponent]
})
export class AccountSettingsModule { }
