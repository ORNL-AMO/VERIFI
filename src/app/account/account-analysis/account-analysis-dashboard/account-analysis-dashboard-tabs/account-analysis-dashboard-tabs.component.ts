import { Component } from '@angular/core';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-account-analysis-dashboard-tabs',
  templateUrl: './account-analysis-dashboard-tabs.component.html',
  styleUrls: ['./account-analysis-dashboard-tabs.component.css']
})
export class AccountAnalysisDashboardTabsComponent {

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
