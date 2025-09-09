import { AbstractControl, ValidatorFn } from '@angular/forms';

export function maxDateValidator(): ValidatorFn {
    let maxDate: Date = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 10);
    return (control: AbstractControl) => {
        if (!control.value) return null;
        const inputDate = new Date(control.value);
        return inputDate > maxDate ? { maxDate: true } : null;
    };
}
export function minDateValidator(): ValidatorFn {
    let minDate: Date = new Date();
    minDate.setFullYear(minDate.getFullYear() - 30);
    return (control: AbstractControl) => {
        if (!control.value) return null;
        const inputDate = new Date(control.value);
        return inputDate < minDate ? { minDate: true } : null;
    };
}