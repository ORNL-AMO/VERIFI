import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { IdbFacility } from 'src/app/models/idb';
import { SetupWizardService } from '../setup-wizard.service';

@Component({
  selector: 'app-setup-wizard-sidebar',
  templateUrl: './setup-wizard-sidebar.component.html',
  styleUrl: './setup-wizard-sidebar.component.css'
})
export class SetupWizardSidebarComponent {

  displaySidebar: boolean;
  facilities: Array<IdbFacility>;
  facilitiesSub: Subscription;
  constructor(private router: Router,
    private setupWizardService: SetupWizardService
  ) { }

  ngOnInit() {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.setDisplaySidebar();
      }
    });
    this.setDisplaySidebar();

    this.facilitiesSub = this.setupWizardService.facilities.subscribe(facilities => {
      this.facilities = facilities;
    })
  }

  ngOnDestroy() {
    this.facilitiesSub.unsubscribe();
  }

  setDisplaySidebar() {
    this.displaySidebar = (this.router.url.includes('welcome') == false);
  }

}
