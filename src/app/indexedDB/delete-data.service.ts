import { Injectable } from '@angular/core';
import { AccountdbService } from './account-db.service';
import { PredictordbService } from './predictors-db.service';
import { UtilityMeterDatadbService } from './utilityMeterData-db.service';
import { UtilityMeterdbService } from './utilityMeter-db.service';
import { UtilityMeterGroupdbService } from './utilityMeterGroup-db.service';
import { FacilitydbService } from './facility-db.service';
import { AccountReportDbService } from './account-report-db.service';
import { AnalysisDbService } from './analysis-db.service';
import { AccountAnalysisDbService } from './account-analysis-db.service';
import { CustomEmissionsDbService } from './custom-emissions-db.service';
import { CustomFuelDbService } from './custom-fuel-db.service';
import { CustomGWPDbService } from './custom-gwp-db.service';
import { IdbAccountAnalysisItem, IdbAccountReport, IdbAnalysisItem, IdbCustomEmissionsItem, IdbCustomFuel, IdbPredictorEntry } from '../models/idb';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { ElectronBackupsDbService } from './electron-backups-db.service';
import { IdbAccount } from '../models/idbModels/account';
import { IdbFacility } from '../models/idbModels/facility';
import { IdbUtilityMeterData } from '../models/idbModels/utilityMeterData';
import { IdbUtilityMeter } from '../models/idbModels/utilityMeter';
import { IdbUtilityMeterGroup } from '../models/idbModels/utilityMeterGroup';
import { IdbCustomGWP } from '../models/idbModels/customGWP';
import { IdbElectronBackup } from '../models/idbModels/electronBackup';

@Injectable({
  providedIn: 'root'
})
export class DeleteDataService {

  isDeleting: BehaviorSubject<boolean>;
  deletingMessaging: BehaviorSubject<{
    index: number,
    totalCount: number,
    message: string,
    percent: number
  }>;

  accountToDelete: IdbAccount;
  accountPredictors: Array<IdbPredictorEntry>;
  accountMeterData: Array<IdbUtilityMeterData>;
  accountMeters: Array<IdbUtilityMeter>;
  accountGroups: Array<IdbUtilityMeterGroup>;
  accountFacilities: Array<IdbFacility>;
  accountReports: Array<IdbAccountReport>;
  accountFuels: Array<IdbCustomFuel>;
  accountEmissions: Array<IdbCustomEmissionsItem>;
  accountGWPs: Array<IdbCustomGWP>;
  accountElectronBackups: Array<IdbElectronBackup>;
  accountFacilityAnalysis: Array<IdbAnalysisItem>;
  accountAnalysisItems: Array<IdbAccountAnalysisItem>;

  pauseDelete: BehaviorSubject<boolean>;
  constructor(private accountDbService: AccountdbService,
    private predictorDbService: PredictordbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService,
    private facilityDbService: FacilitydbService,
    private accountReportDbService: AccountReportDbService,
    private analysisDbService: AnalysisDbService,
    private accountAnalysisDbService: AccountAnalysisDbService,
    private customEmissionsDbService: CustomEmissionsDbService,
    private customFuelDbService: CustomFuelDbService,
    private customGWPDbService: CustomGWPDbService,
    private dbService: NgxIndexedDBService,
    private electronBackupsDbService: ElectronBackupsDbService) {
    this.isDeleting = new BehaviorSubject<boolean>(false);
    this.deletingMessaging = new BehaviorSubject(undefined);
    this.pauseDelete = new BehaviorSubject<boolean>(false);
  }


  setDeletingMessage(index: number, totalCount: number, message: string) {
    this.deletingMessaging.next({
      index: index,
      totalCount: totalCount,
      message: message,
      percent: (index / totalCount) * 100
    });
  }

  setAccountToDelete(allDeleteAccounts: Array<IdbAccount>) {
    if (allDeleteAccounts.length > 0 && !this.accountToDelete) {
      this.accountToDelete = allDeleteAccounts[0];
      this.gatherAndDelete()
    }
  }

  gatherAndDelete() {
    if (this.accountToDelete) {
      this.isDeleting.next(true);
      //predictors
      this.predictorDbService.getAll().subscribe((allPredictors: Array<IdbPredictorEntry>) => {
        this.accountPredictors = allPredictors.filter(idbPredictor => {
          return idbPredictor.accountId == this.accountToDelete.guid;
        })
        this.deletePredictor(0)
      });
    }
  }

  //predictors
  deletePredictor(index: number) {
    if (!this.pauseDelete.getValue()) {
      if (index < this.accountPredictors.length) {
        this.dbService.delete('predictors', this.accountPredictors[index].id).subscribe(() => {
          this.setDeletingMessage(index, this.accountPredictors.length, 'Deleting Predictor Data..');
          this.deletePredictor(index + 1);
        });
      } else {
        this.utilityMeterDataDbService.getAll().subscribe((allMeterData: Array<IdbUtilityMeterData>) => {
          this.accountMeterData = allMeterData.filter(idbMeterData => {
            return idbMeterData.accountId == this.accountToDelete.guid;
          });
          this.deleteMeterData(0)
        });
      }
    }
  }

  //meter data
  deleteMeterData(index: number) {
    if (!this.pauseDelete.getValue()) {
      if (index < this.accountMeterData.length) {
        this.dbService.delete('utilityMeterData', this.accountMeterData[index].id).subscribe(() => {
          this.setDeletingMessage(index, this.accountMeterData.length, 'Deleting Meter Data..');
          this.deleteMeterData(index + 1);
        });
      } else {
        this.utilityMeterDbService.getAll().subscribe((allMeters: Array<IdbUtilityMeter>) => {
          this.accountMeters = allMeters.filter(idbMeter => {
            return idbMeter.accountId == this.accountToDelete.guid;
          });
          this.deleteMeters(0)
        })
      }
    }
  }

  //meters
  deleteMeters(index: number) {
    if (!this.pauseDelete.getValue()) {
      if (index < this.accountMeters.length) {
        this.dbService.delete('utilityMeter', this.accountMeters[index].id).subscribe(() => {
          this.setDeletingMessage(index, this.accountMeters.length, 'Deleting Meters..');
          this.deleteMeters(index + 1);
        });
      } else {
        this.utilityMeterGroupDbService.getAll().subscribe((allGroups: Array<IdbUtilityMeterGroup>) => {
          this.accountGroups = allGroups.filter(group => {
            return group.accountId == this.accountToDelete.guid;
          });
          this.deleteGroups(0);
        })
      }
    }
  }

  //groups
  deleteGroups(index: number) {
    if (!this.pauseDelete.getValue()) {
      if (index < this.accountGroups.length) {
        this.dbService.delete('utilityMeterGroups', this.accountGroups[index].id).subscribe(() => {
          this.setDeletingMessage(index, this.accountGroups.length, 'Deleting Meter Groups..');
          this.deleteGroups(index + 1);
        });
      } else {
        this.analysisDbService.getAll().subscribe((allFacilityAnalysis: Array<IdbAnalysisItem>) => {
          this.accountFacilityAnalysis = allFacilityAnalysis.filter(analysisItem => {
            return analysisItem.accountId == this.accountToDelete.guid;
          });
          this.deleteFacilityAnalysis(0)
        })
      }
    }
  }

  //facility analysis
  deleteFacilityAnalysis(index: number) {
    if (!this.pauseDelete.getValue()) {
      if (index < this.accountFacilityAnalysis.length) {
        this.dbService.delete('analysisItems', this.accountFacilityAnalysis[index].id).subscribe(() => {
          this.setDeletingMessage(index, this.accountFacilityAnalysis.length, 'Deleting Facility Analysis..');
          this.deleteFacilityAnalysis(index + 1);
        });
      } else {
        this.facilityDbService.getAll().subscribe((allFacilities: Array<IdbFacility>) => {
          this.accountFacilities = allFacilities.filter(facility => {
            return facility.accountId == this.accountToDelete.guid;
          });
          this.deleteFacilites(0)
        });
      }
    }
  }

  //facilities
  deleteFacilites(index: number) {
    if (!this.pauseDelete.getValue()) {
      if (index < this.accountFacilities.length) {
        this.dbService.delete('facilities', this.accountFacilities[index].id).subscribe(() => {
          this.setDeletingMessage(index, this.accountFacilities.length, 'Deleting Facilities..');
          this.deleteFacilites(index + 1);
        });
      } else {
        this.accountAnalysisDbService.getAll().subscribe((allAccountAnalysis: Array<IdbAccountAnalysisItem>) => {
          this.accountAnalysisItems = allAccountAnalysis.filter(accountAnalysisItem => {
            return accountAnalysisItem.accountId == this.accountToDelete.guid;
          });
          this.deleteAccountAnalysis(0);
        })
      }
    }
  }

  //account analysis
  deleteAccountAnalysis(index: number) {
    if (!this.pauseDelete.getValue()) {
      if (index < this.accountAnalysisItems.length) {
        this.dbService.delete('accountAnalysisItems', this.accountAnalysisItems[index].id).subscribe(() => {
          this.setDeletingMessage(index, this.accountAnalysisItems.length, 'Deleting Account Analysis..');
          this.deleteAccountAnalysis(index + 1);
        });
      } else {
        this.accountReportDbService.getAll().subscribe((allReports: Array<IdbAccountReport>) => {
          this.accountReports = allReports.filter(report => {
            return report.accountId == this.accountToDelete.guid;
          });
          this.deleteReports(0)
        })
      }
    }
  }

  //reports
  deleteReports(index: number) {
    if (!this.pauseDelete.getValue()) {
      if (index < this.accountReports.length) {
        this.dbService.delete('accountReports', this.accountReports[index].id).subscribe(() => {
          this.setDeletingMessage(index, this.accountReports.length, 'Deleting Account Reports..');
          this.deleteReports(index + 1);
        });
      } else {
        this.customFuelDbService.getAll().subscribe((allCustomFuels: Array<IdbCustomFuel>) => {
          this.accountFuels = allCustomFuels.filter(fuel => {
            return fuel.accountId == this.accountToDelete.guid;
          });
          this.deleteCustomFuels(0);
        })
      }
    }
  }

  //custom fuels
  deleteCustomFuels(index: number) {
    if (!this.pauseDelete.getValue()) {
      if (index < this.accountFuels.length) {
        this.dbService.delete('customFuels', this.accountFuels[index].id).subscribe(() => {
          this.setDeletingMessage(index, this.accountFuels.length, 'Deleting Fuels..');
          this.deleteCustomFuels(index + 1);
        });
      } else {
        this.customEmissionsDbService.getAll().subscribe((allCustomEmissions: Array<IdbCustomEmissionsItem>) => {
          this.accountEmissions = allCustomEmissions.filter(emissions => {
            return emissions.accountId == this.accountToDelete.guid;
          });
          this.deleteEmissions(0)
        })
      }
    }
  }

  //custom emissions
  deleteEmissions(index: number) {
    if (!this.pauseDelete.getValue()) {
      if (index < this.accountEmissions.length) {
        this.dbService.delete('customEmissionsItems', this.accountEmissions[index].id).subscribe(() => {
          this.setDeletingMessage(index, this.accountEmissions.length, 'Deleting Emissions..');
          this.deleteEmissions(index + 1);
        });
      } else {
        this.customGWPDbService.getAll().subscribe((allGWPs: Array<IdbCustomGWP>) => {
          this.accountGWPs = allGWPs.filter(gwp => {
            return gwp.accountId == this.accountToDelete.guid;
          });
          this.deleteCustomGWPs(0)
        });
      }
    }
  }

  //custom gwps
  deleteCustomGWPs(index: number) {
    if (!this.pauseDelete.getValue()) {
      if (index < this.accountGWPs.length) {
        this.dbService.delete('customGWP', this.accountGWPs[index].id).subscribe(() => {
          this.setDeletingMessage(index, this.accountGWPs.length, 'Deleting Custom GWPs..');
          this.deleteCustomGWPs(index + 1);
        });
      } else {
        this.electronBackupsDbService.getAll().subscribe((allBackups: Array<IdbElectronBackup>) => {
          this.accountElectronBackups = allBackups.filter(electronBackup => {
            return electronBackup.accountId == this.accountToDelete.guid;
          });
          this.deleteElectronBackups(0)
        });
      }
    }
  }

  //electron backups
  deleteElectronBackups(index: number) {
    if (!this.pauseDelete.getValue()) {
      if (index < this.accountElectronBackups.length) {
        this.dbService.delete('electronBackups', this.accountElectronBackups[index].id).subscribe(() => {
          this.setDeletingMessage(index, this.accountElectronBackups.length, 'Deleting Electron Backups..');
          this.deleteElectronBackups(index + 1);
        });
      } else {
        this.deleteAccount();
      }
    }
  }

  //finish account delete...
  deleteAccount() {
    this.dbService.delete('accounts', this.accountToDelete.id).subscribe(() => {
      this.setDeletingMessage(.99, 1, 'Finishing up..');
      this.finishDeleteAccount();
    });
  }

  finishDeleteAccount() {
    this.accountToDelete = undefined;
    this.dbService.getAll('accounts').subscribe((allAccounts: Array<IdbAccount>) => {
      this.accountDbService.allAccounts.next(allAccounts);
      this.isDeleting.next(false);
    });
  }

  async cancelDelete() {
    this.accountToDelete.deleteAccount = false;
    await firstValueFrom(this.accountDbService.updateWithObservable(this.accountToDelete));
    this.finishDeleteAccount();
    this.isDeleting.next(false);
    this.pauseDelete.next(false);
  }

}
