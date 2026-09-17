import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PortalModule } from '@angular/cdk/portal';
import { ScrollingModule } from '@angular/cdk/scrolling';

import { AccountDataModule } from '@app/v1/account/data/account-data.module';
import { AccountHomeComponent } from '@app/v1/account/home/account-home.component';
import { AccountPortfolioModule } from '@app/v1/account/portfolio/account-portfolio.module';
import { AccountSettingsModule } from '@app/v1/account/settings/account-settings.module';
import { FacilityDataModule } from '@app/v1/facility/data/facility-data.module';
import { FacilityHomeComponent } from '@app/v1/facility/home/facility-home.component';
import { FacilitySettingsModule } from '@app/v1/facility/settings/facility-settings.module';
import { ShellHeaderComponent } from '@app/v1/shell/header/shell-header.component';
import { PrimaryRailComponent } from '@app/v1/shell/primary-rail/primary-rail.component';
import { FacilityPickerComponent } from '@app/v1/shell/section-nav/facility-picker/facility-picker.component';
import { SectionNavComponent } from '@app/v1/shell/section-nav/section-nav.component';
import { NotificationsModule } from '@app/v1/shared/notifications/notifications.module';
import { IconsModule } from '@app/v1/shared/icons/icons.module';
import { ShellComponent } from '@app/v1/shell/shell.component';
import { SupportPanelComponent } from '@app/v1/shell/support-panel/support-panel.component';
import { WorkspaceShellComponent } from '@app/v1/shell/workspace-shell/workspace-shell.component';
import { V1Routes } from './v1.routes';
import { WelcomeComponent } from '@app/v1/welcome/welcome.component';

@NgModule({
  declarations: [
    ShellComponent,
    ShellHeaderComponent,
    WorkspaceShellComponent,
    PrimaryRailComponent,
    SectionNavComponent,
    FacilityPickerComponent,
    SupportPanelComponent,
    AccountHomeComponent,
    FacilityHomeComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    IconsModule,
    NotificationsModule,
    PortalModule,
    ScrollingModule,
    AccountDataModule,
    AccountPortfolioModule,
    FacilityDataModule,
    AccountSettingsModule,
    FacilitySettingsModule,
    WelcomeComponent,
    RouterModule.forChild(V1Routes)
  ]
})
export class V1Module { }
