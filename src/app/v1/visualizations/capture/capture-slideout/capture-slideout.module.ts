import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { WorkspaceSlideoutComponent } from '@app/v1/shared/workspace-slideout/workspace-slideout.component';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { CaptureSlideoutComponent } from './capture-slideout.component';

@NgModule({ declarations: [CaptureSlideoutComponent], imports: [ReactiveFormsModule, WorkspaceSlideoutComponent, IconComponent], exports: [CaptureSlideoutComponent] })
export class CaptureSlideoutModule { }
