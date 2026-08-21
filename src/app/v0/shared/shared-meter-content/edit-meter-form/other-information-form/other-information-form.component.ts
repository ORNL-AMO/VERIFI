import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';

@Component({
    selector: 'app-other-information-form',
    templateUrl: './other-information-form.component.html',
    styleUrls: ['./other-information-form.component.css'],
    standalone: false
})
export class OtherInformationFormComponent {
  @Input()
  meterForm: FormGroup;
}
