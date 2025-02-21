import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';

@Component({
    selector: 'app-account-reports-dashboard-tabs',
    templateUrl: './account-reports-dashboard-tabs.component.html',
    styleUrls: ['./account-reports-dashboard-tabs.component.css'],
    standalone: false
})
export class AccountReportsDashboardTabsComponent {

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
