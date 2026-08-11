import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { P1HeaderBannerComponent } from './p1/components/header-banner/header-banner.component';
import { P1PrimaryRailComponent } from './p1/components/primary-rail/primary-rail.component';
import { P1RightPanelComponent } from './p1/components/right-panel/right-panel.component';
import { P1SectionNavComponent } from './p1/components/section-nav/section-nav.component';
import { P1WelcomeScreenComponent } from './p1/components/welcome-screen/welcome-screen.component';
import { P1WorkspaceShellComponent } from './p1/components/workspace-shell/workspace-shell.component';
import { P1AccountPlaceholderPageComponent } from './p1/pages/account-placeholder-page/account-placeholder-page.component';
import { P1FacilityPlaceholderPageComponent } from './p1/pages/facility-placeholder-page/facility-placeholder-page.component';
import { P1Component } from './p1/p1.component';
import { PrototypeShellComponent } from './prototype-shell/prototype-shell.component';

@NgModule({
  declarations: [
    PrototypeShellComponent,
    P1Component,
    P1HeaderBannerComponent,
    P1WelcomeScreenComponent,
    P1WorkspaceShellComponent,
    P1PrimaryRailComponent,
    P1SectionNavComponent,
    P1RightPanelComponent,
    P1AccountPlaceholderPageComponent,
    P1FacilityPlaceholderPageComponent
  ],
  exports: [
    PrototypeShellComponent,
    P1Component
  ],
  imports: [RouterModule, FormsModule]
})
export class UxPrototypesModule { }
