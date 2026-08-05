import { Injectable } from '@angular/core';
import { AccountAnalysisDbService } from '../indexedDB/account-analysis-db.service';
import { AccountReportDbService } from '../indexedDB/account-report-db.service';
import { AnalysisDbService } from '../indexedDB/analysis-db.service';
import { CustomEmissionsDbService } from '../indexedDB/custom-emissions-db.service';
import { CustomFuelDbService } from '../indexedDB/custom-fuel-db.service';
import { CustomGWPDbService } from '../indexedDB/custom-gwp-db.service';
import { FacilityEnergyUseEquipmentDbService } from '../indexedDB/facility-energy-use-equipment-db.service';
import { FacilityEnergyUseGroupsDbService } from '../indexedDB/facility-energy-use-groups-db.service';
import { FacilityReportsDbService } from '../indexedDB/facility-reports-db.service';
import { PredictorDataDbService } from '../indexedDB/predictor-data-db.service';
import { PredictorDbService } from '../indexedDB/predictor-db.service';
import { PredictordbServiceDeprecated } from '../indexedDB/predictors-deprecated-db.service';
import { UtilityMeterdbService } from '../indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from '../indexedDB/utilityMeterData-db.service';
import { UtilityMeterGroupdbService } from '../indexedDB/utilityMeterGroup-db.service';
import { AccountWorkspaceSnapshot, WorkspaceSelections } from './account-workspace.models';

/**
 * Temporary read-compatibility bridge for issue #2576. It is removed after all
 * consumers use AccountWorkspaceStore signals. New code must not depend on it.
 */
@Injectable({ providedIn: 'root' })
export class LegacyWorkspaceStateBridge {
  constructor(
    private meters: UtilityMeterdbService,
    private meterData: UtilityMeterDatadbService,
    private meterGroups: UtilityMeterGroupdbService,
    private deprecatedPredictors: PredictordbServiceDeprecated,
    private predictors: PredictorDbService,
    private predictorData: PredictorDataDbService,
    private facilityAnalyses: AnalysisDbService,
    private accountAnalyses: AccountAnalysisDbService,
    private accountReports: AccountReportDbService,
    private facilityReports: FacilityReportsDbService,
    private customEmissions: CustomEmissionsDbService,
    private customFuels: CustomFuelDbService,
    private customGWPs: CustomGWPDbService,
    private energyUseGroups: FacilityEnergyUseGroupsDbService,
    private energyUseEquipment: FacilityEnergyUseEquipmentDbService
  ) { }

  publish(snapshot: AccountWorkspaceSnapshot, selections: WorkspaceSelections): void {
    const facilityGuid = selections.facility?.guid;
    const byFacility = <T extends { facilityId?: string }>(items: readonly T[]) =>
      facilityGuid ? items.filter(item => item.facilityId === facilityGuid) : [];

    this.meters.accountMeters.next([...snapshot.meters]);
    this.meters.facilityMeters.next(byFacility(snapshot.meters));
    this.meters.selectedMeter.next(selections.meter);
    this.meterData.accountMeterData.next([...snapshot.meterData]);
    this.meterData.facilityMeterData.next(byFacility(snapshot.meterData));
    this.meterGroups.accountMeterGroups.next([...snapshot.meterGroups]);
    this.meterGroups.facilityMeterGroups.next(byFacility(snapshot.meterGroups));
    this.deprecatedPredictors.accountPredictorEntries.next([]);
    this.deprecatedPredictors.facilityPredictorEntries.next([]);
    this.deprecatedPredictors.facilityPredictors.next([]);
    this.predictors.accountPredictors.next([...snapshot.predictors]);
    this.predictors.facilityPredictors.next(byFacility(snapshot.predictors));
    this.predictorData.accountPredictorData.next([...snapshot.predictorData]);
    this.predictorData.facilityPredictorData.next(byFacility(snapshot.predictorData));
    this.facilityAnalyses.accountAnalysisItems.next([...snapshot.facilityAnalyses]);
    this.facilityAnalyses.facilityAnalysisItems.next(byFacility(snapshot.facilityAnalyses));
    this.facilityAnalyses.selectedAnalysisItem.next(selections.facilityAnalysis);
    this.accountAnalyses.accountAnalysisItems.next([...snapshot.accountAnalyses]);
    this.accountAnalyses.selectedAnalysisItem.next(selections.accountAnalysis);
    this.accountReports.accountReports.next([...snapshot.accountReports]);
    this.accountReports.selectedReport.next(selections.accountReport);
    this.facilityReports.accountFacilityReports.next([...snapshot.facilityReports]);
    this.facilityReports.facilityReports.next(byFacility(snapshot.facilityReports));
    this.facilityReports.selectedReport.next(selections.facilityReport);
    this.customEmissions.accountEmissionsItems.next([...snapshot.customEmissions]);
    this.customFuels.accountCustomFuels.next([...snapshot.customFuels]);
    this.customGWPs.accountCustomGWPs.next([...snapshot.customGWPs]);
    this.energyUseGroups.accountEnergyUseGroups.next([...snapshot.energyUseGroups]);
    this.energyUseGroups.facilityEnergyUseGroups.next(byFacility(snapshot.energyUseGroups));
    this.energyUseEquipment.accountEnergyUseEquipment.next([...snapshot.energyUseEquipment]);
    this.energyUseEquipment.facilityEnergyUseEquipment.next(byFacility(snapshot.energyUseEquipment));
    this.energyUseEquipment.selectedFacilityEnergyUseEquipment.next(selections.energyUseEquipment);
  }

  clear(): void {
    this.meters.accountMeters.next([]);
    this.meters.facilityMeters.next([]);
    this.meters.selectedMeter.next(undefined);
    this.meterData.accountMeterData.next([]);
    this.meterData.facilityMeterData.next([]);
    this.meterGroups.accountMeterGroups.next([]);
    this.meterGroups.facilityMeterGroups.next([]);
    this.deprecatedPredictors.accountPredictorEntries.next([]);
    this.deprecatedPredictors.facilityPredictorEntries.next([]);
    this.deprecatedPredictors.facilityPredictors.next([]);
    this.predictors.accountPredictors.next([]);
    this.predictors.facilityPredictors.next([]);
    this.predictorData.accountPredictorData.next([]);
    this.predictorData.facilityPredictorData.next([]);
    this.facilityAnalyses.accountAnalysisItems.next([]);
    this.facilityAnalyses.facilityAnalysisItems.next([]);
    this.facilityAnalyses.selectedAnalysisItem.next(undefined);
    this.accountAnalyses.accountAnalysisItems.next([]);
    this.accountAnalyses.selectedAnalysisItem.next(undefined);
    this.accountReports.accountReports.next([]);
    this.accountReports.selectedReport.next(undefined);
    this.facilityReports.accountFacilityReports.next([]);
    this.facilityReports.facilityReports.next([]);
    this.facilityReports.selectedReport.next(undefined);
    this.customEmissions.accountEmissionsItems.next([]);
    this.customFuels.accountCustomFuels.next([]);
    this.customGWPs.accountCustomGWPs.next([]);
    this.energyUseGroups.accountEnergyUseGroups.next([]);
    this.energyUseGroups.facilityEnergyUseGroups.next([]);
    this.energyUseEquipment.accountEnergyUseEquipment.next([]);
    this.energyUseEquipment.facilityEnergyUseEquipment.next([]);
    this.energyUseEquipment.selectedFacilityEnergyUseEquipment.next(undefined);
  }
}
