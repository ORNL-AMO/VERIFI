import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { CalanderizationOptions, CalanderizedMeter } from 'src/app/models/calanderization';
import { IdbAccount, IdbAccountAnalysisItem, IdbFacility, IdbUtilityMeter } from 'src/app/models/idb';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { ConvertMeterDataService } from 'src/app/shared/helper-services/convert-meter-data.service';

@Injectable({
  providedIn: 'root'
})
export class AccountAnalysisService {

  selectedFacility: BehaviorSubject<IdbFacility>;
  calanderizedMeters: Array<CalanderizedMeter>
  calculating: BehaviorSubject<boolean>;
  annualAnalysisSummary: BehaviorSubject<Array<AnnualAnalysisSummary>>;
  monthlyAccountAnalysisData: BehaviorSubject<Array<MonthlyAnalysisSummaryData>>;
  constructor(private accountAnalysisDbService: AccountAnalysisDbService, private utilityMeterDbService: UtilityMeterdbService,
    private calendarizationService: CalanderizationService, private convertMeterDataService: ConvertMeterDataService,
    private accountDbService: AccountdbService) { 
    this.selectedFacility = new BehaviorSubject<IdbFacility>(undefined);
    this.calculating = new BehaviorSubject<boolean>(true);
    this.annualAnalysisSummary = new BehaviorSubject([]);
    this.monthlyAccountAnalysisData = new BehaviorSubject([]);
  }

  setCalanderizedMeters() {
    let analysisItem: IdbAccountAnalysisItem = this.accountAnalysisDbService.selectedAnalysisItem.getValue();
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let calanderizationOptions: CalanderizationOptions = {
      energyIsSource: analysisItem.energyIsSource
    }
    let calanderizedMeterData: Array<CalanderizedMeter> = this.calendarizationService.getCalanderizedMeterData(accountMeters, true, false, calanderizationOptions);
    calanderizedMeterData.forEach(calanderizedMeter => {
      calanderizedMeter.monthlyData = this.convertMeterDataService.convertMeterDataToAnalysis(analysisItem, calanderizedMeter.monthlyData, selectedAccount, calanderizedMeter.meter);
    });
    this.calanderizedMeters = calanderizedMeterData;
  }
}
