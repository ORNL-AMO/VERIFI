import { Component, OnInit, ViewChild } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbAccount, IdbFacility, IdbUtilityMeterData } from 'src/app/models/idb';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import * as confetti from 'canvas-confetti';

@Component({
  selector: 'app-setup-progress',
  templateUrl: './setup-progress.component.html',
  styleUrls: ['./setup-progress.component.css']
})
export class SetupProgressComponent implements OnInit {

  selectedAccount: IdbAccount;
  selectedFacility: IdbFacility;
  newUtilityMeterData: Array<IdbUtilityMeterData>;

  selectedAccountSub: Subscription;
  selectedFacilitySub: Subscription;

  progress: string;
  setupWizard: boolean;
  setupWizardComplete: boolean;

  constructor(
    public accountdbService: AccountdbService,
    public facilitydbService: FacilitydbService,
    public utilityMeterDbService: UtilityMeterdbService,
    public utilityMeterDataDbService: UtilityMeterDatadbService,
    private router: Router
  ) {
    this.router.events.subscribe(
      (event: any) => {
        if (event instanceof NavigationEnd && this.router.url === '/utility/energy-consumption') {
          if(this.selectedAccount) {
            this.selectedAccount.setupWizardComplete = true;
            this.accountdbService.update(this.selectedAccount);
          }
        }
      }
    );
  }

  ngOnInit(): void {
    this.selectedAccountSub = this.accountdbService.selectedAccount.subscribe(selectedAccount => {
      this.selectedAccount = selectedAccount;
      if(selectedAccount) {
        this.setupWizard = selectedAccount.setupWizard;
        this.setupWizardComplete = selectedAccount.setupWizardComplete;
        this.updateProgress();
      }
    });

    this.selectedFacilitySub = this.facilitydbService.selectedFacility.subscribe(selectedFacility => {
      this.selectedFacility = selectedFacility;
      if(selectedFacility) {
        this.updateProgress();
      }
    });
  }

  ngOnDestroy() {
    this.selectedAccountSub.unsubscribe();
    this.selectedFacilitySub.unsubscribe();
  }

  updateProgress() {
    if(this.setupWizard) {
      if(this.selectedAccount && !this.selectedFacility && !this.setupWizardComplete) {
        this.progress = '33%';
      } else if(this.selectedAccount && this.selectedFacility && !this.setupWizardComplete) {
        this.progress = '66%';
      } else if(this.selectedAccount && this.selectedFacility && this.setupWizardComplete) {
        this.progress = '100%';
        setTimeout(() => { this.createConfetti(); }, 1000)
      }
    }
  }

  createConfetti() {
    confetti.create()({
      particleCount: 100,
      spread: 70,
      origin: { y: (1),x: (1) }
    });
  }

  addFacility() {
    if(!this.selectedFacility) {
      let newFacility: IdbFacility = this.facilitydbService.getNewIdbFacility(this.selectedAccount);
      this.facilitydbService.add(newFacility);
    }
    this.router.navigate(['/facility-management']);
  }

  addUtilityData() {
    this.router.navigate(['/utility/energy-consumption']);
  }

  closeSetupWizard() {
    this.selectedAccount.setupWizard = false;
    this.accountdbService.update(this.selectedAccount);
  }
}
