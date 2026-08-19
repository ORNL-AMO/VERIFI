import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CustomNumberPipe } from '@shared/helper-pipes/custom-number.pipe';
import { NaicsListPipe } from '@shared/helper-pipes/naics-list.pipe';
import { OrderByPipe } from '@shared/helper-pipes/order-by.pipe';
import { SettingsLabelPipe } from '@shared/helper-pipes/settings-label.pipe';
import { YearOptionsPipe } from '@shared/helper-pipes/year-options.pipe';
import { GroupNamePipe } from '@shared/helper-pipes/group-name.pipe';
import { FacilityNamePipe } from '@shared/helper-pipes/facility-name.pipe';
import { MonthLabelPipe } from '@shared/helper-pipes/month-label.pipe';
import { PhoneNumberPipe } from '@shared/helper-pipes/phone-number.pipe';
import { ScopeLabelPipe } from '@shared/helper-pipes/scope-label.pipe';
import { AgreementTypeLabelPipe } from '@shared/helper-pipes/agreement-type-label.pipe';
import { YearDisplayPipe } from '@shared/helper-pipes/year-display.pipe';
import { AnalysisTypeLabelPipe } from '@shared/helper-pipes/analysis-type-label.pipe';
import { TotalPipe } from '@shared/helper-pipes/total.pipe';
import { AnalysisCategoryPipe } from '@shared/helper-pipes/analysis-category.pipe';
import { EmissionsDisplayPipe } from '@shared/helper-pipes/emissions-display.pipe';
import { MeterSourceColorPipe } from '@shared/helper-pipes/meter-source-color.pipe';
import { FacilityMetersListPipe } from '@shared/helper-pipes/facility-meters-list.pipe';
import { FacilityPredictorListPipe } from '@shared/helper-pipes/facility-predictor-list.pipe';
import { NaicsDisplayPipe } from '@shared/helper-pipes/naics-display.pipe';
import { AveragePipe } from '@shared/helper-pipes/average.pipe';
import { DegreeDayTotalPipe } from '@shared/helper-pipes/degree-day-total.pipe';
import { RegressionNumberPipe } from '@shared/helper-pipes/regression-number.pipe';
import { FacilityAnalysisNamePipe } from '@shared/helper-pipes/facility-analysis-name.pipe';
import { FacilityReportNamePipe } from '@shared/helper-pipes/facility-report-name.pipe';
import { AccountAnalysisNamePipe } from '@shared/helper-pipes/account-analysis-name.pipe';
import { CharactersRemainingPipe } from '@shared/helper-pipes/characters-remaining.pipe';
import { InvalidMeterPipe } from '@shared/helper-pipes/validation-pipes/invalid-meter.pipe';
import { FacilityItemPipe } from '@shared/helper-pipes/facility-item.pipe';
import { ReportDatePipe } from '@shared/helper-pipes/report-date.pipe';
import { ChargeTypeLabelPipe } from '@shared/helper-pipes/charge-type-label.pipe';
import { FacilityEnergyGroupsListPipe } from '@shared/helper-pipes/facility-energy-groups-list.pipe';
import { FacilityEnergyEquipmentListPipe } from '@shared/helper-pipes/facility-energy-equipment-list.pipe';
import { MeterGroupSourcesListPipe } from '@shared/helper-pipes/meter-group-sources-list.pipe';
import { GwpValueDisplayPipe } from '@shared/helper-pipes/gwp-value-display-pipe';
import { MeterGroupSourcePipe } from '@shared/helper-pipes/meter-group-source-pipe';
import { FacilityEnergyEquipmentNamePipe } from '@shared/helper-pipes/facility-energy-equipment-name.pipe';
import { DisplayPredictorDataDatePipe } from '@shared/helper-pipes/display-predictor-data-date.pipe';
import { DisplayMeterDataDatePipe } from '@shared/helper-pipes/display-meter-data-date.pipe';
import { InvalidMetersPipe } from '@shared/helper-pipes/validation-pipes/invalid-meters.pipe';
import { InvalidMeterDataPipe } from '@shared/helper-pipes/validation-pipes/invalid-meter-data.pipe';
import { InvalidGroupAnalysisPipe } from '@shared/helper-pipes/validation-pipes/invalid-group-analysis.pipe';
import { InvalidAccountAnalysisPipe } from '@shared/helper-pipes/validation-pipes/invalid-account-analysis.pipe';
import { InvalidAnalysisPipe } from '@shared/helper-pipes/validation-pipes/invalid-analysis.pipe';
import { AnalysisItemPipe } from '@shared/helper-pipes/analysis-item.pipe';
import { AccountReportNamePipe } from '@shared/helper-pipes/account-report-name-pipe';
import { EquipmentSourceIconsPipe } from '@shared/helper-pipes/equipment-source-icons.pipe';

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
