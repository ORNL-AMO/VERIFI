import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'analysisResultNumber',
  standalone: true
})
export class AnalysisResultNumberPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (value === null || value === undefined || !Number.isFinite(value)) {
      return '—';
    }
    if (Math.abs(value) < .00001) {
      return '0';
    }
    if (Math.abs(value) < 10000) {
      return value.toLocaleString(undefined, { maximumSignificantDigits: 5 });
    }
    return value.toLocaleString(undefined, { maximumFractionDigits: 0, minimumIntegerDigits: 1 });
  }
}
