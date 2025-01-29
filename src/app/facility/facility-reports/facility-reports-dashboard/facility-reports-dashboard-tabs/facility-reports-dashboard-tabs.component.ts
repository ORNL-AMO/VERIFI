import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';

@Component({
    selector: 'app-facility-reports-dashboard-tabs',
    templateUrl: './facility-reports-dashboard-tabs.component.html',
    styleUrl: './facility-reports-dashboard-tabs.component.css',
    standalone: false
})
export class FacilityReportsDashboardTabsComponent {

  modalOpenSub: Subscription;
  modalOpen: boolean;
  constructor(private sharedDataService: SharedDataService) {
  }

  ngOnInit(): void {
    this.modalOpenSub = this.sharedDataService.modalOpen.subscribe(val => {
      this.modalOpen = val;
    });
  }

  ngOnDestroy() {
    this.modalOpenSub.unsubscribe();
  }
}
