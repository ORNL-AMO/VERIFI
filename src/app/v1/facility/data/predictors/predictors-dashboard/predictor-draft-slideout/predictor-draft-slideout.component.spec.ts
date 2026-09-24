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

  it('collects a valid standard draft before emitting it', () => {
    TestBed.configureTestingModule({ imports: [PredictorDraftSlideoutComponent] });
    const fixture = TestBed.createComponent(PredictorDraftSlideoutComponent);
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);
    fixture.componentInstance.chooseStandard();
    fixture.detectChanges();

    fixture.componentInstance.submit();
    expect(submitted).not.toHaveBeenCalled();

    fixture.componentInstance.setName('Production');
    fixture.componentInstance.setUnit('tons');
    fixture.componentInstance.setProduction('production');
    fixture.componentInstance.submit();

    expect(submitted).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Production', unit: 'tons', production: true, predictorType: 'Standard'
    }));
  });
});
