import { DragDropModule } from '@angular/cdk/drag-drop';
import { ResourcePickerModule } from '@app/v1/visualizations/shared/resource-picker/resource-picker.module';
import { HomeWidgetCardComponent } from './widget-card/widget-card.component';
import { HomeWidgetAdderComponent } from './widget-adder/widget-adder.component';
import { HomeWidgetBoardComponent } from './widget-board/widget-board.component';
import { NgModule } from '@angular/core';
import { PortalModule } from '@angular/cdk/portal';
import { ReactiveFormsModule } from '@angular/forms';
import { ConfirmationDialogComponent } from '@app/v1/shared/a11y/confirmation-dialog.component';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HomeDashboardComponent } from './dashboard/dashboard.component';
import { HomeNavComponent } from './home-nav/home-nav.component';

@NgModule({ declarations: [HomeDashboardComponent, HomeNavComponent, HomeWidgetCardComponent, HomeWidgetAdderComponent, HomeWidgetBoardComponent], imports: [DragDropModule, ResourcePickerModule, CommonModule, RouterModule, ReactiveFormsModule, PortalModule, ConfirmationDialogComponent], exports: [HomeDashboardComponent, HomeNavComponent] })
export class HomeModule { }
