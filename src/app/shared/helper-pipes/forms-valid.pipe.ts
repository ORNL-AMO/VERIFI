import { Pipe, PipeTransform } from '@angular/core';
import { FormGroup } from '@angular/forms';

@Pipe({
  name: 'formsValid',
  standalone: false,
  pure: false
})
export class FormsValidPipe implements PipeTransform {

  transform(forms: Array<FormGroup>): boolean {
    return forms.every(form => form.valid);
  }

}
