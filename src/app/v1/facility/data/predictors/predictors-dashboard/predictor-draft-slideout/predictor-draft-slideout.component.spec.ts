import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { PredictorDraftSlideoutComponent } from './predictor-draft-slideout.component';

describe('PredictorDraftSlideoutComponent', () => {
  it('starts with type choices and sends Weather to its workbench', () => {
    TestBed.configureTestingModule({ imports: [PredictorDraftSlideoutComponent] });
    const fixture = TestBed.createComponent(PredictorDraftSlideoutComponent);
    const weatherSelected = vi.fn();
    fixture.componentInstance.weatherSelected.subscribe(weatherSelected);
    fixture.detectChanges();

    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    buttons.find(button => button.textContent?.includes('Weather predictors'))?.click();

    expect(weatherSelected).toHaveBeenCalledOnce();
    expect(fixture.componentInstance.step()).toBe('choice');
  });

  it('collects checked and unchecked production values in a valid standard draft', () => {
    TestBed.configureTestingModule({ imports: [PredictorDraftSlideoutComponent] });
    const fixture = TestBed.createComponent(PredictorDraftSlideoutComponent);
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);
    fixture.componentInstance.chooseStandard();
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    fixture.componentInstance.submit();
    expect(submitted).not.toHaveBeenCalled();

    fixture.componentInstance.setName('Production');
    fixture.componentInstance.setUnit('tons');
    fixture.componentInstance.submit();

    expect(submitted).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Production', unit: 'tons', production: false, predictorType: 'Standard'
    }));

    submitted.mockClear();
    const productionCheckbox = element.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(productionCheckbox.checked).toBe(false);
    expect(productionCheckbox.parentElement?.textContent).toContain('Is Production?');
    expect(Array.from(element.querySelectorAll<HTMLElement>('.predictor-draft-form__grid label > span'))
      .map(label => label.textContent?.replace(/\s+/g, ' ').trim()))
      .toEqual(['Predictor name', 'Is Production?', 'Unit Optional']);
    productionCheckbox.click();
    fixture.componentInstance.submit();

    expect(submitted).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Production', unit: 'tons', production: true, predictorType: 'Standard'
    }));
  });
});
