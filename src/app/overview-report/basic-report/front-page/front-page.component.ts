import { Component, Input, OnInit } from '@angular/core';
import { ReportOptions } from 'src/app/models/overview-report';

@Component({
  selector: 'app-front-page',
  templateUrl: './front-page.component.html',
  styleUrls: ['./front-page.component.css']
})
export class FrontPageComponent implements OnInit {
  @Input()
  reportOptions: ReportOptions;

  reportDate: Date = new Date();
  constructor() { }

  ngOnInit(): void {

  }
}
