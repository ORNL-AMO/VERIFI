import { Component, OnInit, Input } from '@angular/core';

@Component({
    selector: 'app-calculating-spinner',
    templateUrl: './calculating-spinner.component.html',
    styleUrls: ['./calculating-spinner.component.css'],
    standalone: false
})
export class CalculatingSpinnerComponent implements OnInit {
  @Input()
  message: string;
  @Input()
  error: boolean;
  
  constructor() { }

  ngOnInit(): void {
  }

}
