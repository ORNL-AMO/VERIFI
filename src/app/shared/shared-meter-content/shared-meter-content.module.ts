import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MeterDataComponent } from '@shared/shared-meter-content/meter-data/meter-data.component';
import { MeterDataTableComponent } from '@shared/shared-meter-content/meter-data/meter-data-table/meter-data-table.component';
import { ElectricityDataTableComponent } from '@shared/shared-meter-content/meter-data/meter-data-table/electricity-data-table/electricity-data-table.component';
import { GeneralUtilityDataTableComponent } from '@shared/shared-meter-content/meter-data/meter-data-table/general-utility-data-table/general-utility-data-table.component';
import { OtherEmissionsDataTableComponent } from '@shared/shared-meter-content/meter-data/meter-data-table/other-emissions-data-table/other-emissions-data-table.component';
import { VehicleDataTableComponent } from '@shared/shared-meter-content/meter-data/meter-data-table/vehicle-data-table/vehicle-data-table.component';
import { HelperPipesModule } from '@shared/helper-pipes/_helper-pipes.module';
import { RouterModule } from '@angular/router';
import { TableItemsDropdownModule } from '@shared/table-items-dropdown/table-items-dropdown.module';
import { NgbDatepickerModule, NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { UtilityMeterDataFilterComponent } from '@shared/shared-meter-content/utility-meter-data-filter/utility-meter-data-filter.component';
import { EditBillComponent } from '@shared/shared-meter-content/edit-bill/edit-bill.component';
import { EditVehicleMeterBillComponent } from '@shared/shared-meter-content/edit-bill/edit-vehicle-meter-bill/edit-vehicle-meter-bill.component';
import { RefrigerationCalculationTableComponent } from '@shared/shared-meter-content/edit-bill/edit-other-emissions-bill/refrigeration-calculation-table/refrigeration-calculation-table.component';
import { EditOtherEmissionsBillComponent } from '@shared/shared-meter-content/edit-bill/edit-other-emissions-bill/edit-other-emissions-bill.component';
import { EditElectricityBillComponent } from '@shared/shared-meter-content/edit-bill/edit-electricity-bill/edit-electricity-bill.component';
import { EditUtilityBillComponent } from '@shared/shared-meter-content/edit-bill/edit-utility-bill/edit-utility-bill.component';
import { EditMeterComponent } from '@shared/shared-meter-content/edit-meter/edit-meter.component';
import { EditMeterFormComponent } from '@shared/shared-meter-content/edit-meter-form/edit-meter-form.component';
import { AdditionalElectricityOptionsFormComponent } from '@shared/shared-meter-content/edit-meter-form/additional-electricity-options-form/additional-electricity-options-form.component';
import { EmissionsDetailsTableComponent } from '@shared/shared-meter-content/edit-meter-form/emissions-details-table/emissions-details-table.component';
import { OtherInformationFormComponent } from '@shared/shared-meter-content/edit-meter-form/other-information-form/other-information-form.component';
import { VehicleFormComponent } from '@shared/shared-meter-content/edit-meter-form/vehicle-form/vehicle-form.component';
import { UtilityMetersTableComponent } from '@shared/shared-meter-content/utility-meters-table/utility-meters-table.component';
import { LabelWithTooltipModule } from '@shared/label-with-tooltip/label-with-tooltip.module';
import { SharedMeterCalendarizationComponent } from '@shared/shared-meter-content/shared-meter-calendarization/shared-meter-calendarization.component';
import { CalanderizationChartComponent } from '@shared/shared-meter-content/shared-meter-calendarization/calanderization-chart/calanderization-chart.component';
import { CalanderizationFilterComponent } from '@shared/shared-meter-content/shared-meter-calendarization/calanderization-filter/calanderization-filter.component';
import { CalanderizedMeterDataTableComponent } from '@shared/shared-meter-content/shared-meter-calendarization/calanderized-meter-data-table/calanderized-meter-data-table.component';
import { DataApplicationMenuComponent } from '@shared/shared-meter-content/shared-meter-calendarization/data-application-menu/data-application-menu.component';
import { SetMeterGroupingComponent } from '@shared/shared-meter-content/set-meter-grouping/set-meter-grouping.component';
import { MeterGroupFormComponent } from '@shared/shared-meter-content/set-meter-grouping/meter-group-form/meter-group-form.component';
import { MeterGroupTableComponent } from '@shared/shared-meter-content/set-meter-grouping/meter-group-table/meter-group-table.component';
import { ViewConnectBillComponent } from '@shared/shared-meter-content/meter-data/meter-data-table/view-connect-bill/view-connect-bill.component';
import { EditConnectBillComponent } from '@shared/shared-meter-content/edit-bill/edit-connect-bill/edit-connect-bill.component';
import { MeterChargesFormComponent } from '@shared/shared-meter-content/edit-meter-form/meter-charges-form/meter-charges-form.component';
import { ChargesUnitOptionsPipe } from '@shared/shared-meter-content/edit-meter-form/meter-charges-form/charges-unit-options.pipe';
import { EditBillChargesComponent } from '@shared/shared-meter-content/edit-bill/edit-bill-charges/edit-bill-charges.component';
import { MeterChargePipe } from '@shared/shared-meter-content/edit-bill/edit-bill-charges/meter-charge.pipe';
import { MeterChargeValuePipe } from '@shared/shared-meter-content/meter-data/meter-charge-value.pipe';
import { SharedDataQualityReportMetersModule } from '@shared/shared-data-quality-report-meters/shared-data-quality-report-meters.module';
import { ManageMeterGroupingComponent } from '@shared/shared-meter-content/set-meter-grouping/manage-meter-grouping/manage-meter-grouping.component';
import { MeterGroupingResultsTableComponent } from '@shared/shared-meter-content/set-meter-grouping/meter-grouping-results-table/meter-grouping-results-table.component';
import { MeterGroupingResultsGraphComponent } from '@shared/shared-meter-content/set-meter-grouping/meter-grouping-results-graph/meter-grouping-results-graph.component';
import { CalculatingSpinnerModule } from '@shared/calculating-spinner/calculating-spinner.module';



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
