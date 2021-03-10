import { Component, Input, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { globalVariables } from 'src/environments/environment';

@Component({
  selector: 'app-general-information-form',
  templateUrl: './general-information-form.component.html',
  styleUrls: ['./general-information-form.component.css']
})
export class GeneralInformationFormComponent implements OnInit {
  @Input()
  inAccount: boolean;
  @Input()
  form: FormGroup;
  @Input()
  unitsOfMeasure: string;

  formNameLabel: string = "Account";
  globalVariables = globalVariables;
  constructor() { }

  ngOnInit(): void {
    if (!this.inAccount) {
      this.formNameLabel = "Facility";
    }
  }
}
