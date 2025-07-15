import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MeterDataComponent } from './meter-data/meter-data.component';
import { MeterDataTableComponent } from './meter-data/meter-data-table/meter-data-table.component';
import { ElectricityDataTableComponent } from './meter-data/meter-data-table/electricity-data-table/electricity-data-table.component';
import { GeneralUtilityDataTableComponent } from './meter-data/meter-data-table/general-utility-data-table/general-utility-data-table.component';
import { OtherEmissionsDataTableComponent } from './meter-data/meter-data-table/other-emissions-data-table/other-emissions-data-table.component';
import { VehicleDataTableComponent } from './meter-data/meter-data-table/vehicle-data-table/vehicle-data-table.component';
import { HelperPipesModule } from '../helper-pipes/_helper-pipes.module';
import { RouterModule } from '@angular/router';
import { TableItemsDropdownModule } from '../table-items-dropdown/table-items-dropdown.module';
import { NgbDatepickerModule, NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { UtilityMeterDataFilterComponent } from './utility-meter-data-filter/utility-meter-data-filter.component';
import { EditBillComponent } from './edit-bill/edit-bill.component';
import { EditVehicleMeterBillComponent } from './edit-bill/edit-vehicle-meter-bill/edit-vehicle-meter-bill.component';
import { RefrigerationCalculationTableComponent } from './edit-bill/edit-other-emissions-bill/refrigeration-calculation-table/refrigeration-calculation-table.component';
import { EditOtherEmissionsBillComponent } from './edit-bill/edit-other-emissions-bill/edit-other-emissions-bill.component';
import { EditElectricityBillComponent } from './edit-bill/edit-electricity-bill/edit-electricity-bill.component';
import { EditUtilityBillComponent } from './edit-bill/edit-utility-bill/edit-utility-bill.component';
import { EditMeterComponent } from './edit-meter/edit-meter.component';
import { EditMeterFormComponent } from './edit-meter-form/edit-meter-form.component';
import { AdditionalElectricityOptionsFormComponent } from './edit-meter-form/additional-electricity-options-form/additional-electricity-options-form.component';
import { EmissionsDetailsTableComponent } from './edit-meter-form/emissions-details-table/emissions-details-table.component';
import { OtherInformationFormComponent } from './edit-meter-form/other-information-form/other-information-form.component';
import { VehicleFormComponent } from './edit-meter-form/vehicle-form/vehicle-form.component';
import { UtilityMetersTableComponent } from './utility-meters-table/utility-meters-table.component';
import { LabelWithTooltipModule } from '../label-with-tooltip/label-with-tooltip.module';
import { SharedMeterCalendarizationComponent } from './shared-meter-calendarization/shared-meter-calendarization.component';
import { CalanderizationChartComponent } from './shared-meter-calendarization/calanderization-chart/calanderization-chart.component';
import { CalanderizationFilterComponent } from './shared-meter-calendarization/calanderization-filter/calanderization-filter.component';
import { CalanderizedMeterDataTableComponent } from './shared-meter-calendarization/calanderized-meter-data-table/calanderized-meter-data-table.component';
import { DataApplicationMenuComponent } from './shared-meter-calendarization/data-application-menu/data-application-menu.component';
import { SetMeterGroupingComponent } from './set-meter-grouping/set-meter-grouping.component';
import { MeterGroupFormComponent } from './set-meter-grouping/meter-group-form/meter-group-form.component';
import { MeterGroupTableComponent } from './set-meter-grouping/meter-group-table/meter-group-table.component';
import { ViewConnectBillComponent } from './meter-data/meter-data-table/view-connect-bill/view-connect-bill.component';
import { EditConnectBillComponent } from './edit-bill/edit-connect-bill/edit-connect-bill.component';
import { MeterChargesFormComponent } from './edit-meter-form/meter-charges-form/meter-charges-form.component';
import { ChargesUnitOptionsPipe } from './edit-meter-form/meter-charges-form/charges-unit-options.pipe';
import { EditBillChargesComponent } from './edit-bill/edit-bill-charges/edit-bill-charges.component';
import { MeterChargePipe } from './edit-bill/edit-bill-charges/meter-charge.pipe';
import { ChargeUnitDisplayPipe } from './edit-bill/edit-bill-charges/charge-unit-display.pipe';



@NgModule({
  declarations: [
    MeterDataComponent,
    MeterDataTableComponent,
    ElectricityDataTableComponent,
    GeneralUtilityDataTableComponent,
    OtherEmissionsDataTableComponent,
    VehicleDataTableComponent,
    UtilityMeterDataFilterComponent,
    EditBillComponent,
    EditVehicleMeterBillComponent,
    RefrigerationCalculationTableComponent,
    EditOtherEmissionsBillComponent,
    EditElectricityBillComponent,
    EditUtilityBillComponent,
    EditMeterComponent,
    EditMeterFormComponent,
    AdditionalElectricityOptionsFormComponent,
    EmissionsDetailsTableComponent,
    OtherInformationFormComponent,
    VehicleFormComponent,
    UtilityMetersTableComponent,
    SharedMeterCalendarizationComponent,
    CalanderizationChartComponent,
    CalanderizationFilterComponent,
    CalanderizedMeterDataTableComponent,
    DataApplicationMenuComponent,
    SetMeterGroupingComponent,
    MeterGroupFormComponent,
    MeterGroupTableComponent,
    ViewConnectBillComponent,
    EditConnectBillComponent,
    MeterChargesFormComponent,
    ChargesUnitOptionsPipe,
    EditBillChargesComponent,
    MeterChargePipe,
    ChargeUnitDisplayPipe
  ],
  imports: [
    CommonModule,
    HelperPipesModule,
    RouterModule,
    TableItemsDropdownModule,
    NgbPaginationModule,
    FormsModule,
    ReactiveFormsModule,
    LabelWithTooltipModule,
    NgbDatepickerModule
  ],
  exports: [
    EditMeterFormComponent,
    SharedMeterCalendarizationComponent,
    ElectricityDataTableComponent,
    GeneralUtilityDataTableComponent,
    OtherEmissionsDataTableComponent,
    VehicleDataTableComponent,
    SetMeterGroupingComponent
  ]
})
export class SharedMeterContentModule { }
