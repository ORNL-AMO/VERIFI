import { TestBed } from '@angular/core/testing';
import { AccountAnalysisDraftSlideoutComponent } from './account-analysis-draft-slideout.component';

describe('account analysis creation categories', () => {
  for (const category of ['energy', 'water'] as const) {
    it(`creates a ${category}-only analysis without showing a category choice`, () => {
      const fixture = TestBed.configureTestingModule({ imports: [AccountAnalysisDraftSlideoutComponent] })
        .createComponent(AccountAnalysisDraftSlideoutComponent);
      fixture.componentRef.setInput('energyAvailable', category === 'energy');
      fixture.componentRef.setInput('waterAvailable', category === 'water');
      fixture.componentRef.setInput('showCategory', false);
      const submitted = vi.fn(); fixture.componentInstance.submitted.subscribe(submitted);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[formControlName="category"]')).toBeNull();
      expect(fixture.nativeElement.textContent).not.toContain('categor');
      const button = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(button.disabled).toBe(false); button.click();
      expect(submitted).toHaveBeenCalledWith({ scope: 'account', category });
      fixture.componentRef.setInput('saving', true); fixture.detectChanges();
      fixture.componentInstance.submit(); expect(submitted).toHaveBeenCalledTimes(1);
    });
  }

  it('keeps both choices visible, disables unavailable categories, and selects an eligible default', () => {
    const fixture = TestBed.configureTestingModule({ imports: [AccountAnalysisDraftSlideoutComponent] })
      .createComponent(AccountAnalysisDraftSlideoutComponent);
    fixture.componentRef.setInput('waterAvailable', true); fixture.detectChanges();
    const select = fixture.nativeElement.querySelector('[formControlName="category"]') as HTMLSelectElement;
    expect(select.value).toBe('water'); expect(select.options[0].disabled).toBe(true);
    fixture.componentRef.setInput('energyAvailable', true); fixture.detectChanges();
    expect(select.value).toBe('water'); expect(select.options[0].disabled).toBe(false);
    fixture.componentRef.setInput('waterAvailable', false); fixture.detectChanges();
    expect(select.value).toBe('energy');
  });

  it('does not submit when neither category has a facility analysis', () => {
    const fixture = TestBed.configureTestingModule({ imports: [AccountAnalysisDraftSlideoutComponent] })
      .createComponent(AccountAnalysisDraftSlideoutComponent);
    const submitted = vi.fn(); fixture.componentInstance.submitted.subscribe(submitted);
    fixture.detectChanges(); fixture.componentInstance.submit();
    expect(submitted).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(true);
  });

  it('requires a facility, uses its categories, and emits its GUID even when names match', () => {
    const fixture = TestBed.configureTestingModule({ imports: [AccountAnalysisDraftSlideoutComponent] })
      .createComponent(AccountAnalysisDraftSlideoutComponent);
    fixture.componentRef.setInput('facilities', [
      { guid: 'energy-plant', name: 'Plant', energyAvailable: true, waterAvailable: false },
      { guid: 'water-plant', name: 'Plant', energyAvailable: false, waterAvailable: true }
    ]);
    fixture.componentRef.setInput('energyAvailable', true);
    const submitted = vi.fn(); fixture.componentInstance.submitted.subscribe(submitted);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[formControlName="facilityGuid"]')).toBeNull();
    fixture.componentInstance.form.controls.scope.setValue('facility'); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[formControlName="facilityGuid"]')).not.toBeNull();
    fixture.componentInstance.submit(); expect(submitted).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(true);
    fixture.componentInstance.form.controls.facilityGuid.setValue('water-plant'); fixture.detectChanges();
    expect(fixture.componentInstance.category.value).toBe('water');
    expect(fixture.nativeElement.querySelector('[formControlName="category"] option[value="energy"]').disabled).toBe(true);
    fixture.nativeElement.querySelector('button[type="submit"]').click();
    expect(submitted).toHaveBeenLastCalledWith({ scope: 'facility', category: 'water', facilityGuid: 'water-plant' });
    fixture.componentInstance.form.controls.facilityGuid.setValue('energy-plant'); fixture.detectChanges();
    expect(fixture.componentInstance.category.value).toBe('energy');
    fixture.componentInstance.form.controls.scope.setValue('account'); fixture.detectChanges();
    fixture.componentInstance.submit();
    expect(submitted).toHaveBeenLastCalledWith({ scope: 'account', category: 'energy' });
  });

  it('explains missing facilities or meter groups and blocks removed owners and duplicate submissions', () => {
    const fixture = TestBed.configureTestingModule({ imports: [AccountAnalysisDraftSlideoutComponent] })
      .createComponent(AccountAnalysisDraftSlideoutComponent);
    const submitted = vi.fn(); fixture.componentInstance.submitted.subscribe(submitted);
    fixture.componentInstance.form.controls.scope.setValue('facility'); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Add a facility');
    fixture.componentRef.setInput('facilities', [{ guid: 'empty', name: 'Empty plant', energyAvailable: false, waterAvailable: false }]);
    fixture.componentInstance.form.controls.facilityGuid.setValue('empty'); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Create a meter group');
    fixture.componentInstance.submit(); expect(submitted).not.toHaveBeenCalled();
    fixture.componentRef.setInput('facilities', [{ guid: 'empty', name: 'Empty plant', energyAvailable: true, waterAvailable: false }]);
    fixture.componentRef.setInput('showCategory', false); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[formControlName="category"]')).toBeNull();
    fixture.componentRef.setInput('saving', true); fixture.detectChanges();
    expect(Array.from<HTMLSelectElement>(fixture.nativeElement.querySelectorAll('select')).every(select => select.disabled)).toBe(true);
    fixture.componentInstance.submit(); expect(submitted).not.toHaveBeenCalled();
    fixture.componentRef.setInput('saving', false); fixture.componentRef.setInput('facilities', []); fixture.detectChanges();
    fixture.componentInstance.submit(); expect(submitted).not.toHaveBeenCalled();
  });
});
