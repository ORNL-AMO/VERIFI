import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-scorecard-status',
  templateUrl: './scorecard-status.component.html',
  styleUrls: ['./scorecard-status.component.css']
})
export class ScorecardStatusComponent implements OnInit {

  dateOne: Date = new Date(2018, 4);
  dateTwo: Date = new Date(2018, 9);
  constructor() { }

  ngOnInit(): void {
  }

}
