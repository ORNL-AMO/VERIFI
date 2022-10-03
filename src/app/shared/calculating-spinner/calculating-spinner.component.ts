import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-calculating-spinner',
  templateUrl: './calculating-spinner.component.html',
  styleUrls: ['./calculating-spinner.component.css']
})
export class CalculatingSpinnerComponent implements OnInit {
  @Input()
  message: string;
  constructor() { }

  ngOnInit(): void {
  }

}
