import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { IconsModule } from '@app/v1/shared/icons/icons.module';
import { ConfirmationDialogComponent } from '@app/v1/shared/a11y/confirmation-dialog.component';
import { FacilitySettingsBackupComponent } from './facility-settings-backup.component';
import { ImportFacilityBackupComponent } from './import-facility-backup.component';

@NgModule({
  declarations: [FacilitySettingsBackupComponent],
  imports: [CommonModule, IconsModule, ConfirmationDialogComponent, ImportFacilityBackupComponent],
  exports: [FacilitySettingsBackupComponent]
})
export class FacilityBackupToolsModule {}
