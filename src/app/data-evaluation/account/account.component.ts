import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { DataEvaluationService } from '../data-evaluation.service';

@Component({
    selector: 'app-account',
    templateUrl: './account.component.html',
    styleUrls: ['./account.component.css'],
    standalone: false
})
export class AccountComponent implements OnInit {

  print: boolean = false;
  printSub: Subscription;
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
