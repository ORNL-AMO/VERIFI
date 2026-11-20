import { NgModule } from '@angular/core';
import { PortalModule } from '@angular/cdk/portal';
import { ReactiveFormsModule } from '@angular/forms';
import { ConfirmationDialogComponent } from '@app/v1/shared/a11y/confirmation-dialog.component';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HomeDashboardComponent } from './dashboard/dashboard.component';
import { HomeNavComponent } from './home-nav/home-nav.component';

@NgModule({ declarations: [HomeDashboardComponent, HomeNavComponent], imports: [CommonModule, RouterModule, ReactiveFormsModule, PortalModule, ConfirmationDialogComponent], exports: [HomeDashboardComponent, HomeNavComponent] })
export class HomeModule { }
