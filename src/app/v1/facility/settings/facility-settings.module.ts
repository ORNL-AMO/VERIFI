import { DataValidationSettingsPanelComponent } from '@app/v1/shared/settings/data-validation-settings-panel/data-validation-settings-panel.component';
import { ConfirmationDialogComponent } from '@app/v1/shared/a11y/confirmation-dialog.component';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IconsModule } from '@app/v1/shared/icons/icons.module';
import { ImportFacilityBackupComponent } from './backup/import-facility-backup.component';
import { FacilitySettingsBackupComponent } from './backup/facility-settings-backup.component';
import { FacilitySettingsComponent } from './facility-settings.component';
import { FacilitySettingsDeleteComponent } from './delete/facility-settings-delete.component';
import { FacilitySettingsFinancialComponent } from './financial/facility-settings-financial.component';
import { FacilitySettingsGoalsComponent } from './goals/facility-settings-goals.component';
import { PortfolioTransitionSettingsComponent } from './portfolio-transition/portfolio-transition-settings.component';
import { FacilitySettingsProfileComponent } from './profile/facility-settings-profile.component';
import { FacilitySettingsDataValidationComponent } from './data-validation/facility-settings-data-validation.component';
import { FacilitySettingsUnitsComponent } from './units/facility-settings-units.component';

@NgModule({
  declarations: [
    FacilitySettingsComponent,
    FacilitySettingsProfileComponent,
    FacilitySettingsUnitsComponent,
    FacilitySettingsGoalsComponent,
    FacilitySettingsFinancialComponent,
    FacilitySettingsDataValidationComponent,
    FacilitySettingsBackupComponent,
    PortfolioTransitionSettingsComponent,
    FacilitySettingsDeleteComponent
  ],
  imports: [
    CommonModule,
    ConfirmationDialogComponent,
    DataValidationSettingsPanelComponent,
    IconsModule,
    ReactiveFormsModule,
    RouterModule,
    ImportFacilityBackupComponent
  ],
  exports: [FacilitySettingsComponent]
})
export class FacilitySettingsModule { }
