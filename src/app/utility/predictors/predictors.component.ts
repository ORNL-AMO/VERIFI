import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-predictors',
  templateUrl: './predictors.component.html',
  styleUrls: ['./predictors.component.css']
})
export class PredictorsComponent implements OnInit {
  months: any = [
    'Jan',
    'Feb',
    'March',
    'April',
    'May',
    'June',
    'July',
    'Aug',
    'Sept',
    'Oct',
    'Nov',
    'Dec',
  ];

  predictor: any = ["Production 1","Production 2","Production 3"]

  constructor() { }

  ngOnInit(): void {

  }

}
