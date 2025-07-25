import { Component, Input } from '@angular/core';
import { Subscription } from 'rxjs';
import { DataOverviewReportSetup } from 'src/app/models/overview-report';
import { DataOverviewFacility } from '../data-overview-report.component';
import { DataEvaluationService } from 'src/app/data-evaluation/data-evaluation.service';

@Component({
    selector: 'app-data-overview-facility-report',
    templateUrl: './data-overview-facility-report.component.html',
    styleUrls: ['./data-overview-facility-report.component.css'],
    standalone: false
})
export class DataOverviewFacilityReportComponent {
  @Input()
  dataOverviewFacility: DataOverviewFacility;
  @Input()
  overviewReport: DataOverviewReportSetup;

  printSub: Subscription;
  print: boolean;
  constructor(private dataEvaluationService: DataEvaluationService) { }

  ngOnInit(): void {
    this.printSub = this.dataEvaluationService.print.subscribe(print => {
      this.print = print;
    });
  }

  ngOnDestroy(){
    this.printSub.unsubscribe();
  }
}
