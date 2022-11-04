import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { IdbFacility } from 'src/app/models/idb';
import { SetupWizardService } from '../setup-wizard.service';

@Component({
  selector: 'app-setup-wizard-footer',
  templateUrl: './setup-wizard-footer.component.html',
  styleUrls: ['./setup-wizard-footer.component.css']
})
export class SetupWizardFooterComponent implements OnInit {

  progress: string = '0%';
  progressLabel: string = 'Welcome';
  showSubmit: boolean;
  showAddFacility: boolean;
  facilities: Array<IdbFacility>;
  facilitiesSub: Subscription;
  canContinue: boolean;
  canContinueSub: Subscription;
  routerSub: Subscription;
  constructor(private router: Router, private setupWizardService: SetupWizardService) {

  }

  ngOnInit(): void {
    this.routerSub = this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.setProgress();
      }
    });
    this.setProgress();

    this.canContinueSub = this.setupWizardService.canContinue.subscribe(val => {
      this.canContinue = val;
    });

    this.facilitiesSub = this.setupWizardService.facilities.subscribe(val => {
      this.facilities = val;
    })
  }

  ngOnDestroy() {
    this.canContinueSub.unsubscribe();
    this.facilitiesSub.unsubscribe();
    this.routerSub.unsubscribe();
  }

  back() {
    if (this.router.url.includes('account-setup')) {
      if (this.router.url.includes('information-setup')) {
        this.router.navigateByUrl('setup-wizard/welcome')
      } else if (this.router.url.includes('units-setup')) {
        this.router.navigateByUrl('setup-wizard/account-setup/information-setup')
      } else if (this.router.url.includes('reporting-setup')) {
        this.router.navigateByUrl('setup-wizard/account-setup/units-setup')
      }

    } else if (this.router.url.includes('facility-setup')) {
      if (this.router.url.includes('information-setup')) {
        let selectedFacility: IdbFacility = this.setupWizardService.selectedFacility.getValue();
        let setupFacilities: Array<IdbFacility> = this.setupWizardService.facilities.getValue();
        let facilityIndex: number = setupFacilities.findIndex(facility => { return facility.wizardId == selectedFacility.wizardId });
        if (facilityIndex == 0 || setupFacilities.length == 0) {
          this.router.navigateByUrl('setup-wizard/account-setup/reporting-setup')
        } else {
          this.setupWizardService.selectedFacility.next(setupFacilities[facilityIndex - 1]);
          this.router.navigateByUrl('setup-wizard/facility-setup/reporting-setup');
        }
      } else if (this.router.url.includes('units-setup')) {
        this.router.navigateByUrl('setup-wizard/facility-setup/information-setup')
      } else if (this.router.url.includes('reporting-setup')) {
        this.router.navigateByUrl('setup-wizard/facility-setup/units-setup')
      }
      // this.router.navigateByUrl('setup-wizard/account-setup');
    } else if (this.router.url.includes('confirmation')) {
      this.router.navigateByUrl('setup-wizard/facility-setup');
    }
  }

  next() {
    if (this.router.url.includes('welcome')) {
      this.router.navigateByUrl('setup-wizard/account-setup')
    } else if (this.router.url.includes('account-setup')) {
      if (this.router.url.includes('information-setup')) {
        this.router.navigateByUrl('setup-wizard/account-setup/units-setup')
      } else if (this.router.url.includes('units-setup')) {
        this.router.navigateByUrl('setup-wizard/account-setup/reporting-setup')
      } else if (this.router.url.includes('reporting-setup')) {
        this.router.navigateByUrl('setup-wizard/facility-setup')
      }
    } else if (this.router.url.includes('facility-setup')) {
      let templateExists: boolean = this.setupWizardService.facilityTemplateWorkbook.getValue() != undefined;
      if (templateExists) {
        this.router.navigateByUrl('setup-wizard/confirmation')
      } else {
        if (this.router.url.includes('information-setup')) {
          this.router.navigateByUrl('setup-wizard/facility-setup/units-setup')
        } else if (this.router.url.includes('units-setup')) {
          this.router.navigateByUrl('setup-wizard/facility-setup/reporting-setup')
        } else if (this.router.url.includes('reporting-setup')) {

          let selectedFacility: IdbFacility = this.setupWizardService.selectedFacility.getValue();
          let setupFacilities: Array<IdbFacility> = this.setupWizardService.facilities.getValue();
          let facilityIndex: number = setupFacilities.findIndex(facility => { return facility.wizardId == selectedFacility.wizardId });
          if (facilityIndex == setupFacilities.length - 1) {
            this.router.navigateByUrl('setup-wizard/confirmation')
          } else {
            this.setupWizardService.selectedFacility.next(setupFacilities[facilityIndex + 1]);
            this.router.navigateByUrl('setup-wizard/facility-setup/information-setup');
          }
        }
      }
    }
  }

  setProgress() {
    if (this.router.url.includes('welcome')) {
      this.setupWizardService.canContinue.next(true);
      this.showAddFacility = false;
      this.showSubmit = false;
      this.progressLabel = 'Welcome to VERIFI'
      this.progress = '0%';
    } else if (this.router.url.includes('account-setup')) {
      this.showAddFacility = false;
      this.showSubmit = false;
      this.progressLabel = 'Step 1. Add Account Details';
      this.progress = '33%';
    } else if (this.router.url.includes('facility-setup')) {
      this.showAddFacility = true;
      this.showSubmit = false;
      this.progressLabel = 'Step 2. Add Facilities';
      this.progress = '66%';
    } else if (this.router.url.includes('confirmation')) {
      this.showAddFacility = false;
      this.showSubmit = true;
      this.progressLabel = 'Step 3. Confirm Account Setup';
      this.progress = '100%';
    }
  }

  addfacility() {
    this.setupWizardService.addFacility();
  }

  resetFacilities() {
    this.setupWizardService.facilities.next([]);
    this.setupWizardService.selectedFacility.next(undefined);
  }
}
