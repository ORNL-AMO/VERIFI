import { FacilityBackupToolsModule } from '@app/v1/facility/settings/backup/facility-backup-tools.module';
import { PageIdentityComponent } from '@app/v1/shared/page-identity/page-identity.component';
import { DataValidationSettingsPanelComponent } from '@app/v1/shared/settings/data-validation-settings-panel/data-validation-settings-panel.component';
import { ConfirmationDialogComponent } from '@app/v1/shared/a11y/confirmation-dialog.component';
import { CommonModule } from '@angular/common';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IconsModule } from '@app/v1/shared/icons/icons.module';
import { ImportAccountBackupComponent } from '@app/v1/welcome/import-account-backup/import-account-backup.component';
import { AccountSettingsComponent } from './account-settings.component';
import { AccountSettingsBackupComponent } from './backup/account-settings-backup.component';
import { AccountSettingsDeleteComponent } from './delete/account-settings-delete.component';
import { AccountSettingsFinancialComponent } from './financial/account-settings-financial.component';
import { AccountSettingsGoalsComponent } from './goals/account-settings-goals.component';
import { AccountSettingsPortfolioComponent } from './portfolio/account-settings-portfolio.component';
import { AccountSettingsProfileComponent } from './profile/account-settings-profile.component';
import { AccountSettingsDataValidationComponent } from './data-validation/account-settings-data-validation.component';
import { AccountSettingsUnitsComponent } from './units/account-settings-units.component';
import { FacilitiesModule } from '@app/v1/data/facilities/facilities.module';

@NgModule({
  declarations: [
    AccountSettingsComponent,
    AccountSettingsProfileComponent,
    AccountSettingsUnitsComponent,
    AccountSettingsGoalsComponent,
    AccountSettingsFinancialComponent,
    AccountSettingsDataValidationComponent,
    AccountSettingsBackupComponent,
    AccountSettingsPortfolioComponent,
    AccountSettingsDeleteComponent
  ],
  imports: [
    PageIdentityComponent,
    CommonModule,
    DragDropModule,
    ConfirmationDialogComponent,
    DataValidationSettingsPanelComponent,
    IconsModule,
    ReactiveFormsModule,
    RouterModule,
    FacilitiesModule,
    ImportAccountBackupComponent,
    FacilityBackupToolsModule
  ],
  exports: [AccountSettingsComponent]
})
export class AccountSettingsModule { }
