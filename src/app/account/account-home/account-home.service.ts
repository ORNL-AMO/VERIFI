import { Injectable } from '@angular/core';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { CalanderizationOptions, CalanderizedMeter } from 'src/app/models/calanderization';
import { IdbAccount, IdbAccountAnalysisItem, IdbUtilityMeter } from 'src/app/models/idb';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { ConvertMeterDataService } from 'src/app/shared/helper-services/convert-meter-data.service';
import * as _ from 'lodash';
import { AnnualAnalysisSummary } from 'src/app/models/analysis';
import { AccountAnalysisCalculationsService } from 'src/app/shared/shared-analysis/calculations/account-analysis-calculations.service';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AccountHomeService {

  calanderizedMeters: Array<CalanderizedMeter>;
  latestAnalysisItem: IdbAccountAnalysisItem;
  latestAnalysisSummary: BehaviorSubject<AnnualAnalysisSummary>;
  constructor(private accountAnalysisDbService: AccountAnalysisDbService, private utilityMeterDbService: UtilityMeterdbService,
    private accountDbService: AccountdbService, private calendarizationService: CalanderizationService, private convertMeterDataService: ConvertMeterDataService,
    private accountAnalysisCalculationsService: AccountAnalysisCalculationsService) { 
      this.latestAnalysisSummary = new BehaviorSubject<AnnualAnalysisSummary>(undefined)
    }

  setCalanderizedMeters() {
    let analysisItems: Array<IdbAccountAnalysisItem> = this.accountAnalysisDbService.accountAnalysisItems.getValue();
    this.latestAnalysisItem = _.maxBy(analysisItems, 'reportYear');
    if (this.latestAnalysisItem) {
      let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
      let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
      let calanderizationOptions: CalanderizationOptions = {
        energyIsSource: this.latestAnalysisItem.energyIsSource
      }
      let calanderizedMeterData: Array<CalanderizedMeter> = this.calendarizationService.getCalanderizedMeterData(accountMeters, true, false, calanderizationOptions);
      calanderizedMeterData.forEach(calanderizedMeter => {
        calanderizedMeter.monthlyData = this.convertMeterDataService.convertMeterDataToAnalysis(this.latestAnalysisItem, calanderizedMeter.monthlyData, selectedAccount, calanderizedMeter.meter);
      });
      this.calanderizedMeters = calanderizedMeterData;
    } else {
      this.calanderizedMeters = undefined;
    }
  }

  setAnalysisSummary(account: IdbAccount) {
    if (this.latestAnalysisItem) {
      let analysisSummaries: Array<AnnualAnalysisSummary> = this.accountAnalysisCalculationsService.getAnnualAnalysisSummary(this.latestAnalysisItem, account, this.calanderizedMeters);
      let latestSummary: AnnualAnalysisSummary = _.maxBy(analysisSummaries, 'year');
      this.latestAnalysisSummary.next(latestSummary)
    } else {
      this.latestAnalysisSummary.next(undefined);
    }

  }
}
