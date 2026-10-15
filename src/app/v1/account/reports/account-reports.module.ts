import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { AccountReportsLandingComponent } from './account-reports-landing/account-reports-landing.component';

@NgModule({ declarations: [AccountReportsLandingComponent], imports: [RouterModule, IconComponent] })
export class AccountReportsModule { }
