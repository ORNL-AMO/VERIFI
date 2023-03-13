import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountReportsService } from './account-reports/account-reports.service';

@Component({
  selector: 'app-account',
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.css']
})
export class AccountComponent implements OnInit {

  print: boolean = false;
  printSub: Subscription;
  constructor(private accountReportsService: AccountReportsService) { }

  ngOnInit(): void {
    this.printSub = this.accountReportsService.print.subscribe(print => {
      this.print = print;
    });
  }

  ngOnDestroy(){
    this.printSub.unsubscribe();
  }
}
