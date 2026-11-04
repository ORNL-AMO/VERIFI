import { WorkspaceCheckIndicatorComponent } from '@app/v1/shell/header/workspace-check-indicator/workspace-check-indicator.component';
import { NavigationMotionDirective } from '@app/v1/shared/navigation/navigation-motion/navigation-motion.directive';
import { FacilityReportsModule } from '@app/v1/reports/facility/facility-reports.module';
import { AccountReportsModule } from '@app/v1/reports/account/account-reports.module';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { OverlayModule } from '@angular/cdk/overlay';
import { FacilityPickerComponent } from '@app/v1/shell/header/facility-picker/facility-picker.component';
import { RouterModule } from '@angular/router';
import { PortalModule } from '@angular/cdk/portal';
import { ScrollingModule } from '@angular/cdk/scrolling';

import { DataModule } from '@app/v1/data/data.module';
import { AccountHomeComponent } from '@app/v1/account/home/account-home.component';
import { AccountSettingsModule } from '@app/v1/account/settings/account-settings.module';
import { FacilityHomeComponent } from '@app/v1/facility/home/facility-home.component';
import { FacilitySettingsModule } from '@app/v1/facility/settings/facility-settings.module';
import { ShellHeaderComponent } from '@app/v1/shell/header/shell-header.component';
import { PrimaryRailComponent } from '@app/v1/shell/primary-rail/primary-rail.component';
import { SectionNavModule } from '@app/v1/shell/section-nav/section-nav.module';
import { StatusEvaluationMessageComponent } from '@app/v1/shared/status/status-evaluation-message/status-evaluation-message.component';
import { StatusFindingActionComponent } from '@app/v1/shared/status/status-finding-action/status-finding-action.component';
import { NotificationsModule } from '@app/v1/shared/notifications/notifications.module';
import { IconsModule } from '@app/v1/shared/icons/icons.module';
import { ShellComponent } from '@app/v1/shell/shell.component';
import { SupportPanelComponent } from '@app/v1/shell/support-panel/support-panel.component';
import { WorkspaceShellComponent } from '@app/v1/shell/workspace-shell/workspace-shell.component';
import { V1Routes } from '@app/v1/v1.routes';
import { WelcomeComponent } from '@app/v1/welcome/welcome.component';

@NgModule({
  declarations: [
    ShellComponent,
    ShellHeaderComponent,
    WorkspaceCheckIndicatorComponent,
    FacilityPickerComponent,
    WorkspaceShellComponent,
    PrimaryRailComponent,
    SupportPanelComponent,
    AccountHomeComponent,
    FacilityHomeComponent
  ],
  imports: [
    CommonModule,
    SectionNavModule,
    StatusEvaluationMessageComponent,
    StatusFindingActionComponent,
    FormsModule,
    ReactiveFormsModule,
    OverlayModule,
    IconsModule,
    NotificationsModule,
    PortalModule,
    ScrollingModule,
    NavigationMotionDirective,
    DataModule,
    FacilityReportsModule,
    AccountReportsModule,
    AccountSettingsModule,
    FacilitySettingsModule,
    WelcomeComponent,
    RouterModule.forChild(V1Routes)
  ]
})
export class V1Module { }
