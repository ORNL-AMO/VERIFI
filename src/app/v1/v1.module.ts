import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { AccountHomeComponent } from './account/home/account-home.component';
import { AccountSettingsModule } from './account/settings/account-settings.module';
import { FacilityHomeComponent } from './facility/home/facility-home.component';
import { ShellHeaderComponent } from './shell/header/shell-header.component';
import { PrimaryRailComponent } from './shell/primary-rail/primary-rail.component';
import { SectionNavComponent } from './shell/section-nav/section-nav.component';
import { ShellComponent } from './shell/shell.component';
import { SupportPanelComponent } from './shell/support-panel/support-panel.component';
import { WorkspaceShellComponent } from './shell/workspace-shell/workspace-shell.component';
import { V1Routes } from './v1.routes';
import { WelcomeComponent } from './welcome/welcome.component';

@NgModule({
  declarations: [
    ShellComponent,
    ShellHeaderComponent,
    WorkspaceShellComponent,
    PrimaryRailComponent,
    SectionNavComponent,
    SupportPanelComponent,
    AccountHomeComponent,
    FacilityHomeComponent
  ],
  imports: [
    CommonModule,
    AccountSettingsModule,
    WelcomeComponent,
    RouterModule.forChild(V1Routes)
  ]
})
export class V1Module { }
