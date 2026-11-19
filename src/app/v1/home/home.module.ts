import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HomeDashboardComponent } from './dashboard/dashboard.component';
import { HomeNavComponent } from './home-nav/home-nav.component';

@NgModule({ declarations: [HomeDashboardComponent, HomeNavComponent], imports: [CommonModule, RouterModule], exports: [HomeDashboardComponent, HomeNavComponent] })
export class HomeModule { }
