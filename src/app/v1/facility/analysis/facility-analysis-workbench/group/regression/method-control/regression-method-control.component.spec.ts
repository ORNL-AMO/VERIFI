import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { FacilityAnalysisRegressionController } from '../facility-analysis-regression.controller';
import { FacilityAnalysisRegressionFacade } from '../facility-analysis-regression.facade';
import { RegressionMethodControlComponent } from './regression-method-control.component';

describe('RegressionMethodControlComponent', () => {
  it('renders the shared reactive method selector and disabled generation state', async () => {
    const method = new FormControl<'generated' | 'userDefined'>('generated', { nonNullable: true });
    const generating = signal(true);
    await TestBed.configureTestingModule({
      imports: [RegressionMethodControlComponent],
      providers: [
        { provide: FacilityAnalysisRegressionController, useValue: { method } },
        { provide: FacilityAnalysisRegressionFacade, useValue: { generating } }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(RegressionMethodControlComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('fieldset')?.disabled).toBe(true);
    expect(element.querySelector('.v1-regression-method__option--active')?.textContent).toContain('Generate models');

    generating.set(false);
    fixture.detectChanges();
    const options = element.querySelectorAll<HTMLInputElement>('input[type="radio"]');
    options[1].click();
    expect(method.value).toBe('userDefined');
  });
});
