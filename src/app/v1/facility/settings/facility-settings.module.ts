import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ImportFacilityBackupComponent } from './backup/import-facility-backup.component';
import { FacilitySettingsBackupComponent } from './backup/facility-settings-backup.component';
import { FacilitySettingsComponent } from './facility-settings.component';
import { FacilitySettingsDeleteComponent } from './delete/facility-settings-delete.component';
import { FacilitySettingsFinancialComponent } from './financial/facility-settings-financial.component';
import { FacilitySettingsGoalsComponent } from './goals/facility-settings-goals.component';
import { PortfolioTransitionSettingsComponent } from './portfolio-transition/portfolio-transition-settings.component';
import { FacilitySettingsProfileComponent } from './profile/facility-settings-profile.component';
import { FacilitySettingsStalenessComponent } from './staleness/facility-settings-staleness.component';
import { FacilitySettingsUnitsComponent } from './units/facility-settings-units.component';

@NgModule({
  declarations: [
    FacilitySettingsComponent,
    FacilitySettingsProfileComponent,
    FacilitySettingsUnitsComponent,
    FacilitySettingsGoalsComponent,
    FacilitySettingsFinancialComponent,
    FacilitySettingsStalenessComponent,
    FacilitySettingsBackupComponent,
    PortfolioTransitionSettingsComponent,
    FacilitySettingsDeleteComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    ImportFacilityBackupComponent
  ],
  exports: [FacilitySettingsComponent]
})
export class FacilitySettingsModule { }
