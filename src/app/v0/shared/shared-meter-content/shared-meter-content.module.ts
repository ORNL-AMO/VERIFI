import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MeterDataComponent } from '@v0/shared/shared-meter-content/meter-data/meter-data.component';
import { MeterDataTableComponent } from '@v0/shared/shared-meter-content/meter-data/meter-data-table/meter-data-table.component';
import { ElectricityDataTableComponent } from '@v0/shared/shared-meter-content/meter-data/meter-data-table/electricity-data-table/electricity-data-table.component';
import { GeneralUtilityDataTableComponent } from '@v0/shared/shared-meter-content/meter-data/meter-data-table/general-utility-data-table/general-utility-data-table.component';
import { OtherEmissionsDataTableComponent } from '@v0/shared/shared-meter-content/meter-data/meter-data-table/other-emissions-data-table/other-emissions-data-table.component';
import { VehicleDataTableComponent } from '@v0/shared/shared-meter-content/meter-data/meter-data-table/vehicle-data-table/vehicle-data-table.component';
import { HelperPipesModule } from '@v0/shared/helper-pipes/_helper-pipes.module';
import { RouterModule } from '@angular/router';
import { TableItemsDropdownModule } from '@v0/shared/table-items-dropdown/table-items-dropdown.module';
import { NgbDatepickerModule, NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { UtilityMeterDataFilterComponent } from '@v0/shared/shared-meter-content/utility-meter-data-filter/utility-meter-data-filter.component';
import { EditBillComponent } from '@v0/shared/shared-meter-content/edit-bill/edit-bill.component';
import { EditVehicleMeterBillComponent } from '@v0/shared/shared-meter-content/edit-bill/edit-vehicle-meter-bill/edit-vehicle-meter-bill.component';
import { RefrigerationCalculationTableComponent } from '@v0/shared/shared-meter-content/edit-bill/edit-other-emissions-bill/refrigeration-calculation-table/refrigeration-calculation-table.component';
import { EditOtherEmissionsBillComponent } from '@v0/shared/shared-meter-content/edit-bill/edit-other-emissions-bill/edit-other-emissions-bill.component';
import { EditElectricityBillComponent } from '@v0/shared/shared-meter-content/edit-bill/edit-electricity-bill/edit-electricity-bill.component';
import { EditUtilityBillComponent } from '@v0/shared/shared-meter-content/edit-bill/edit-utility-bill/edit-utility-bill.component';
import { EditMeterComponent } from '@v0/shared/shared-meter-content/edit-meter/edit-meter.component';
import { EditMeterFormComponent } from '@v0/shared/shared-meter-content/edit-meter-form/edit-meter-form.component';
import { AdditionalElectricityOptionsFormComponent } from '@v0/shared/shared-meter-content/edit-meter-form/additional-electricity-options-form/additional-electricity-options-form.component';
import { EmissionsDetailsTableComponent } from '@v0/shared/shared-meter-content/edit-meter-form/emissions-details-table/emissions-details-table.component';
import { OtherInformationFormComponent } from '@v0/shared/shared-meter-content/edit-meter-form/other-information-form/other-information-form.component';
import { VehicleFormComponent } from '@v0/shared/shared-meter-content/edit-meter-form/vehicle-form/vehicle-form.component';
import { UtilityMetersTableComponent } from '@v0/shared/shared-meter-content/utility-meters-table/utility-meters-table.component';
import { LabelWithTooltipModule } from '@v0/shared/label-with-tooltip/label-with-tooltip.module';
import { SharedMeterCalendarizationComponent } from '@v0/shared/shared-meter-content/shared-meter-calendarization/shared-meter-calendarization.component';
import { CalanderizationChartComponent } from '@v0/shared/shared-meter-content/shared-meter-calendarization/calanderization-chart/calanderization-chart.component';
import { CalanderizationFilterComponent } from '@v0/shared/shared-meter-content/shared-meter-calendarization/calanderization-filter/calanderization-filter.component';
import { CalanderizedMeterDataTableComponent } from '@v0/shared/shared-meter-content/shared-meter-calendarization/calanderized-meter-data-table/calanderized-meter-data-table.component';
import { DataApplicationMenuComponent } from '@v0/shared/shared-meter-content/shared-meter-calendarization/data-application-menu/data-application-menu.component';
import { SetMeterGroupingComponent } from '@v0/shared/shared-meter-content/set-meter-grouping/set-meter-grouping.component';
import { MeterGroupFormComponent } from '@v0/shared/shared-meter-content/set-meter-grouping/meter-group-form/meter-group-form.component';
import { MeterGroupTableComponent } from '@v0/shared/shared-meter-content/set-meter-grouping/meter-group-table/meter-group-table.component';
import { ViewConnectBillComponent } from '@v0/shared/shared-meter-content/meter-data/meter-data-table/view-connect-bill/view-connect-bill.component';
import { EditConnectBillComponent } from '@v0/shared/shared-meter-content/edit-bill/edit-connect-bill/edit-connect-bill.component';
import { MeterChargesFormComponent } from '@v0/shared/shared-meter-content/edit-meter-form/meter-charges-form/meter-charges-form.component';
import { ChargesUnitOptionsPipe } from '@v0/shared/shared-meter-content/edit-meter-form/meter-charges-form/charges-unit-options.pipe';
import { EditBillChargesComponent } from '@v0/shared/shared-meter-content/edit-bill/edit-bill-charges/edit-bill-charges.component';
import { MeterChargePipe } from '@v0/shared/shared-meter-content/edit-bill/edit-bill-charges/meter-charge.pipe';
import { MeterChargeValuePipe } from '@v0/shared/shared-meter-content/meter-data/meter-charge-value.pipe';
import { SharedDataQualityReportMetersModule } from '@v0/shared/shared-data-quality-report-meters/shared-data-quality-report-meters.module';
import { ManageMeterGroupingComponent } from '@v0/shared/shared-meter-content/set-meter-grouping/manage-meter-grouping/manage-meter-grouping.component';
import { MeterGroupingResultsTableComponent } from '@v0/shared/shared-meter-content/set-meter-grouping/meter-grouping-results-table/meter-grouping-results-table.component';
import { MeterGroupingResultsGraphComponent } from '@v0/shared/shared-meter-content/set-meter-grouping/meter-grouping-results-graph/meter-grouping-results-graph.component';
import { CalculatingSpinnerModule } from '@v0/shared/calculating-spinner/calculating-spinner.module';



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
    MeterChargeValuePipe,
    ManageMeterGroupingComponent,
    MeterGroupingResultsTableComponent,
    MeterGroupingResultsGraphComponent
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
    NgbDatepickerModule,
    SharedDataQualityReportMetersModule,
    CalculatingSpinnerModule
  ],
  exports: [
    EditMeterFormComponent,
    SharedMeterCalendarizationComponent,
    ElectricityDataTableComponent,
    GeneralUtilityDataTableComponent,
    OtherEmissionsDataTableComponent,
    VehicleDataTableComponent,
    SetMeterGroupingComponent,
    MeterDataComponent,
    UtilityMetersTableComponent
  ]
})
export class SharedMeterContentModule { }
