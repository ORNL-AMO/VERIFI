import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';

@Component({
    selector: 'app-analysis-dashboard-tabs',
    templateUrl: './analysis-dashboard-tabs.component.html',
    styleUrls: ['./analysis-dashboard-tabs.component.css'],
    standalone: false
})
export class AnalysisDashboardTabsComponent {

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
