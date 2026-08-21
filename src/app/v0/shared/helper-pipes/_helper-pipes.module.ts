import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CustomNumberPipe } from '@v0/shared/helper-pipes/custom-number.pipe';
import { NaicsListPipe } from '@v0/shared/helper-pipes/naics-list.pipe';
import { OrderByPipe } from '@v0/shared/helper-pipes/order-by.pipe';
import { SettingsLabelPipe } from '@v0/shared/helper-pipes/settings-label.pipe';
import { YearOptionsPipe } from '@v0/shared/helper-pipes/year-options.pipe';
import { GroupNamePipe } from '@v0/shared/helper-pipes/group-name.pipe';
import { FacilityNamePipe } from '@v0/shared/helper-pipes/facility-name.pipe';
import { MonthLabelPipe } from '@v0/shared/helper-pipes/month-label.pipe';
import { PhoneNumberPipe } from '@v0/shared/helper-pipes/phone-number.pipe';
import { ScopeLabelPipe } from '@v0/shared/helper-pipes/scope-label.pipe';
import { AgreementTypeLabelPipe } from '@v0/shared/helper-pipes/agreement-type-label.pipe';
import { YearDisplayPipe } from '@v0/shared/helper-pipes/year-display.pipe';
import { AnalysisTypeLabelPipe } from '@v0/shared/helper-pipes/analysis-type-label.pipe';
import { TotalPipe } from '@v0/shared/helper-pipes/total.pipe';
import { AnalysisCategoryPipe } from '@v0/shared/helper-pipes/analysis-category.pipe';
import { EmissionsDisplayPipe } from '@v0/shared/helper-pipes/emissions-display.pipe';
import { MeterSourceColorPipe } from '@v0/shared/helper-pipes/meter-source-color.pipe';
import { FacilityMetersListPipe } from '@v0/shared/helper-pipes/facility-meters-list.pipe';
import { FacilityPredictorListPipe } from '@v0/shared/helper-pipes/facility-predictor-list.pipe';
import { NaicsDisplayPipe } from '@v0/shared/helper-pipes/naics-display.pipe';
import { AveragePipe } from '@v0/shared/helper-pipes/average.pipe';
import { DegreeDayTotalPipe } from '@v0/shared/helper-pipes/degree-day-total.pipe';
import { RegressionNumberPipe } from '@v0/shared/helper-pipes/regression-number.pipe';
import { FacilityAnalysisNamePipe } from '@v0/shared/helper-pipes/facility-analysis-name.pipe';
import { FacilityReportNamePipe } from '@v0/shared/helper-pipes/facility-report-name.pipe';
import { AccountAnalysisNamePipe } from '@v0/shared/helper-pipes/account-analysis-name.pipe';
import { CharactersRemainingPipe } from '@v0/shared/helper-pipes/characters-remaining.pipe';
import { InvalidMeterPipe } from '@v0/shared/helper-pipes/validation-pipes/invalid-meter.pipe';
import { FacilityItemPipe } from '@v0/shared/helper-pipes/facility-item.pipe';
import { ReportDatePipe } from '@v0/shared/helper-pipes/report-date.pipe';
import { ChargeTypeLabelPipe } from '@v0/shared/helper-pipes/charge-type-label.pipe';
import { FacilityEnergyGroupsListPipe } from '@v0/shared/helper-pipes/facility-energy-groups-list.pipe';
import { FacilityEnergyEquipmentListPipe } from '@v0/shared/helper-pipes/facility-energy-equipment-list.pipe';
import { MeterGroupSourcesListPipe } from '@v0/shared/helper-pipes/meter-group-sources-list.pipe';
import { GwpValueDisplayPipe } from '@v0/shared/helper-pipes/gwp-value-display-pipe';
import { MeterGroupSourcePipe } from '@v0/shared/helper-pipes/meter-group-source-pipe';
import { FacilityEnergyEquipmentNamePipe } from '@v0/shared/helper-pipes/facility-energy-equipment-name.pipe';
import { DisplayPredictorDataDatePipe } from '@v0/shared/helper-pipes/display-predictor-data-date.pipe';
import { DisplayMeterDataDatePipe } from '@v0/shared/helper-pipes/display-meter-data-date.pipe';
import { InvalidMetersPipe } from '@v0/shared/helper-pipes/validation-pipes/invalid-meters.pipe';
import { InvalidMeterDataPipe } from '@v0/shared/helper-pipes/validation-pipes/invalid-meter-data.pipe';
import { InvalidGroupAnalysisPipe } from '@v0/shared/helper-pipes/validation-pipes/invalid-group-analysis.pipe';
import { InvalidAccountAnalysisPipe } from '@v0/shared/helper-pipes/validation-pipes/invalid-account-analysis.pipe';
import { InvalidAnalysisPipe } from '@v0/shared/helper-pipes/validation-pipes/invalid-analysis.pipe';
import { AnalysisItemPipe } from '@v0/shared/helper-pipes/analysis-item.pipe';
import { AccountReportNamePipe } from '@v0/shared/helper-pipes/account-report-name-pipe';
import { EquipmentSourceIconsPipe } from '@v0/shared/helper-pipes/equipment-source-icons.pipe';

@NgModule({
  declarations: [
    CustomNumberPipe,
    NaicsListPipe,
    OrderByPipe,
    SettingsLabelPipe,
    YearOptionsPipe,
    GroupNamePipe,
    FacilityNamePipe,
    MonthLabelPipe,
    PhoneNumberPipe,
    ScopeLabelPipe,
    AgreementTypeLabelPipe,
    YearDisplayPipe,
    AnalysisTypeLabelPipe,
    TotalPipe,
    AnalysisCategoryPipe,
    EmissionsDisplayPipe,
    MeterSourceColorPipe,
    FacilityMetersListPipe,
    FacilityPredictorListPipe,
    NaicsDisplayPipe,
    AveragePipe,
    DegreeDayTotalPipe,
    RegressionNumberPipe,
    FacilityAnalysisNamePipe,
    FacilityReportNamePipe,
    AccountAnalysisNamePipe,
    CharactersRemainingPipe,
    InvalidMeterPipe,
    FacilityItemPipe,
    ReportDatePipe,
    ChargeTypeLabelPipe,
    FacilityEnergyGroupsListPipe,
    FacilityEnergyEquipmentListPipe,
    MeterGroupSourcesListPipe,
    GwpValueDisplayPipe,
    MeterGroupSourcePipe,
    FacilityEnergyEquipmentNamePipe,
    DisplayPredictorDataDatePipe,
    DisplayMeterDataDatePipe,
    InvalidMetersPipe,
    InvalidMeterDataPipe,
    InvalidGroupAnalysisPipe,
    InvalidAccountAnalysisPipe,
    InvalidAnalysisPipe,
    AnalysisItemPipe,
    AccountReportNamePipe,
    EquipmentSourceIconsPipe
  ],
  imports: [
    CommonModule
  ],
  exports: [
    CustomNumberPipe,
    NaicsListPipe,
    OrderByPipe,
    SettingsLabelPipe,
    YearOptionsPipe,
    GroupNamePipe,
    FacilityNamePipe,
    MonthLabelPipe,
    PhoneNumberPipe,
    ScopeLabelPipe,
    AgreementTypeLabelPipe,
    YearDisplayPipe,
    AnalysisTypeLabelPipe,
    TotalPipe,
    AnalysisCategoryPipe,
    EmissionsDisplayPipe,
    MeterSourceColorPipe,
    FacilityMetersListPipe,
    FacilityPredictorListPipe,
    NaicsDisplayPipe,
    AveragePipe,
    DegreeDayTotalPipe,
    RegressionNumberPipe,
    FacilityAnalysisNamePipe,
    FacilityReportNamePipe,
    AccountAnalysisNamePipe,
    CharactersRemainingPipe,
    InvalidMeterPipe,
    FacilityItemPipe,
    ReportDatePipe,
    ChargeTypeLabelPipe,
    FacilityEnergyGroupsListPipe,
    FacilityEnergyEquipmentListPipe,
    MeterGroupSourcesListPipe,
    GwpValueDisplayPipe,
    MeterGroupSourcePipe,
    FacilityEnergyEquipmentNamePipe,
    DisplayPredictorDataDatePipe,
    DisplayMeterDataDatePipe,
    InvalidMetersPipe,
    InvalidMeterDataPipe,
    InvalidGroupAnalysisPipe,
    InvalidAccountAnalysisPipe,
    InvalidAnalysisPipe,
    AnalysisItemPipe,
    AccountReportNamePipe,
    EquipmentSourceIconsPipe
  ]
})
export class HelperPipesModule { }
