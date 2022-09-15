import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
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
  constructor(private router: Router, private setupWizardService: SetupWizardService) {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.setProgress();
      }
    });
  }

  ngOnInit(): void {
    this.setProgress();
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
        this.router.navigateByUrl('setup-wizard/account-setup/reporting-setup')
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
      if (this.router.url.includes('information-setup')) {
        this.router.navigateByUrl('setup-wizard/facility-setup/units-setup')
      } else if (this.router.url.includes('units-setup')) {
        this.router.navigateByUrl('setup-wizard/facility-setup/reporting-setup')
      } else if (this.router.url.includes('reporting-setup')) {
        this.router.navigateByUrl('setup-wizard/confirmation')
      }
    }
  }

  setProgress() {
    if (this.router.url.includes('welcome')) {
      this.showSubmit = false;
      this.progressLabel = 'Welcome to VERIFI'
      this.progress = '0%';
    } else if (this.router.url.includes('account-setup')) {
      this.showSubmit = false;
      this.progressLabel = 'Step 1. Add Account Details';
      this.progress = '33%';
    } else if (this.router.url.includes('facility-setup')) {
      this.showSubmit = false;
      this.progressLabel = 'Step 2. Add Facilities';
      this.progress = '66%';
    } else if (this.router.url.includes('confirmation')) {
      this.showSubmit = true;
      this.progressLabel = 'Step 3. Confirm Account Setup';
      this.progress = '100%';
    }
  }

  submitAccount() {
    this.setupWizardService.submit.next(true);
  }
}
