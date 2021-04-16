import { Component, OnInit } from '@angular/core';
import { DashboardService } from '../dashboard.service';

@Component({
  selector: 'app-dashboard-help-panel',
  templateUrl: './dashboard-help-panel.component.html',
  styleUrls: ['./dashboard-help-panel.component.css']
})
export class DashboardHelpPanelComponent implements OnInit {

  constructor(private dashboardService: DashboardService) { }

  ngOnInit(): void {
  }


  hideHelp(){
    this.dashboardService.helpOpen.next(false);
  }
}
