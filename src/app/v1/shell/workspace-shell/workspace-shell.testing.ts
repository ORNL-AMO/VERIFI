import { CommonModule } from '@angular/common';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NavigationMotionDirective } from '@app/v1/shared/navigation/navigation-motion/navigation-motion.directive';
import { IconsModule } from '@app/v1/shared/icons/icons.module';
import { NotificationsModule } from '@app/v1/shared/notifications/notifications.module';
import { StatusEvaluationMessageComponent } from '@app/v1/shared/status/status-evaluation-message/status-evaluation-message.component';
import { StatusFindingActionComponent } from '@app/v1/shared/status/status-finding-action/status-finding-action.component';
import { PrimaryRailComponent } from '../primary-rail/primary-rail.component';
import { SectionNavModule } from '../section-nav/section-nav.module';
import { SupportPanelComponent } from '../support-panel/support-panel.component';
import { PanelResizeHandleComponent } from '../panel-resize-handle/panel-resize-handle.component';
import { WorkspaceShellComponent } from './workspace-shell.component';

/** One AOT declaration owner for real shell components used by browser fixtures. */
@NgModule({
  declarations: [WorkspaceShellComponent, PanelResizeHandleComponent, PrimaryRailComponent, SupportPanelComponent],
  imports: [CommonModule, RouterModule, ScrollingModule, SectionNavModule, IconsModule, NotificationsModule,
    NavigationMotionDirective, StatusEvaluationMessageComponent, StatusFindingActionComponent],
  exports: [WorkspaceShellComponent, PanelResizeHandleComponent, PrimaryRailComponent, SupportPanelComponent]
})
export class WorkspaceShellBrowserTestModule {}
