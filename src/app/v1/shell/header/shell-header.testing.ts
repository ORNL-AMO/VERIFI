import { WorkspaceCheckIndicatorComponent } from './workspace-check-indicator/workspace-check-indicator.component';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { FacilityPickerTestModule } from './facility-picker/facility-picker.testing';
import { ShellHeaderComponent } from './shell-header.component';

@NgModule({
  imports: [CommonModule, IconComponent, FacilityPickerTestModule],
  declarations: [ShellHeaderComponent, WorkspaceCheckIndicatorComponent],
  exports: [ShellHeaderComponent]
})
export class ShellHeaderTestModule {}
