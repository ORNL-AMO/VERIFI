import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccountOverviewComponent } from '@v0/data-evaluation/account/account-overview/account-overview.component';
import { AccountOverviewBannerComponent } from '@v0/data-evaluation/account/account-overview/account-overview-banner/account-overview-banner.component';
import { EnergyOverviewComponent } from '@v0/data-evaluation/account/account-overview/energy-overview/energy-overview.component';
import { CostsOverviewComponent } from '@v0/data-evaluation/account/account-overview/costs-overview/costs-overview.component';
import { EmissionsOverviewComponent } from '@v0/data-evaluation/account/account-overview/emissions-overview/emissions-overview.component';
import { RouterModule } from '@angular/router';
import { WaterOverviewComponent } from '@v0/data-evaluation/account/account-overview/water-overview/water-overview.component';
import { HelperPipesModule } from '@v0/shared/helper-pipes/_helper-pipes.module';
import { CalculatingSpinnerModule } from '@v0/shared/calculating-spinner/calculating-spinner.module';
import { DataOverviewModule } from '@v0/shared/data-overview/data-overview.module';
import { FormsModule } from '@angular/forms';
import { AccountOverviewOptions } from '@v0/data-evaluation/account/account-overview/account-overview-banner/account-overview-options/account-overview-options';



@NgModule({
  declarations: [
    AccountOverviewComponent,
    AccountOverviewBannerComponent,
    EnergyOverviewComponent,
    CostsOverviewComponent,
    EmissionsOverviewComponent,
    WaterOverviewComponent,
    AccountOverviewOptions
  ],
  imports: [
    CommonModule,
    RouterModule,
    HelperPipesModule,
    CalculatingSpinnerModule,
    DataOverviewModule,
    FormsModule
  ]
})
export class AccountOverviewModule { }
