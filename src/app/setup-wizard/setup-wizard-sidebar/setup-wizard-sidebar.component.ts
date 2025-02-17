import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SetupWizardService } from '../setup-wizard.service';
import { FileReference } from 'src/app/upload-data/upload-data-models';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
  selector: 'app-setup-wizard-sidebar',
  templateUrl: './setup-wizard-sidebar.component.html',
  styleUrl: './setup-wizard-sidebar.component.css',
  standalone: false
})
export class SetupWizardSidebarComponent {

  displaySidebar: boolean;
  facilities: Array<IdbFacility>;
  facilitiesSub: Subscription;

  fileReferences: Array<FileReference>;
  fileReferencesSub: Subscription;
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
    });

    this.fileReferencesSub = this.setupWizardService.fileReferences.subscribe(fileReferences => {
      this.fileReferences = fileReferences;
      console.log(this.fileReferences);
    })
  }

  ngOnDestroy() {
    this.facilitiesSub.unsubscribe();
    this.fileReferencesSub.unsubscribe();
  }

  setDisplaySidebar() {
    this.displaySidebar = (this.router.url.includes('welcome') == false);
  }

}
