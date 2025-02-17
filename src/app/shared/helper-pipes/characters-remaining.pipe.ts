import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'charactersRemaining',
  standalone: false
})
export class CharactersRemainingPipe implements PipeTransform {

  transform(value: string, numCharsAllowed: number): number {
    if (value) {
      return numCharsAllowed - value.length;
    } else {
      return numCharsAllowed;
    }
  }

}
