import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ImportStepperComponent } from './import-stepper.component';

describe('ImportStepperComponent', () => {
  it('links completed and current steps while leaving future steps blocked', () => {
    const fixture = TestBed.configureTestingModule({
      imports: [ImportStepperComponent],
      providers: [provideRouter([])]
    }).createComponent(ImportStepperComponent);
    fixture.componentRef.setInput('accountGuid', 'account-1');
    fixture.componentRef.setInput('fileId', 'draft-1');
    fixture.componentRef.setInput('fileName', 'utility-data.xlsx');
    fixture.componentRef.setInput('steps', [
      { id: 'facilities', label: 'Facilities', help: '' },
      { id: 'meters', label: 'Meters', help: '' },
      { id: 'review', label: 'Review', help: '' }
    ]);
    fixture.componentRef.setInput('currentStep', 'meters');
    fixture.componentRef.setInput('completedSteps', ['facilities']);
    fixture.componentRef.setInput('activeFile', true);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    const links = element.querySelectorAll<HTMLAnchorElement>('a');

    expect(links.length).toBe(2);
    expect(links[0].getAttribute('href')).toBe('/v1/workspace/account/account-1/imports/file/draft-1/facilities');
    expect(links[1].getAttribute('aria-current')).toBe('step');
    expect(element.querySelector('.is-complete .step-number')?.textContent).toContain('✓');
    expect(element.querySelector('[aria-disabled="true"]')?.textContent).toContain('Review');
  });

  it('blocks every step while import navigation is disabled', () => {
    const fixture = TestBed.configureTestingModule({
      imports: [ImportStepperComponent],
      providers: [provideRouter([])]
    }).createComponent(ImportStepperComponent);
    fixture.componentRef.setInput('accountGuid', 'account-1');
    fixture.componentRef.setInput('fileId', 'draft-1');
    fixture.componentRef.setInput('fileName', 'utility-data.xlsx');
    fixture.componentRef.setInput('steps', [{ id: 'facilities', label: 'Facilities', help: '' }]);
    fixture.componentRef.setInput('currentStep', 'facilities');
    fixture.componentRef.setInput('completedSteps', []);
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('a')).toBeNull();
    expect(element.querySelector('[aria-disabled="true"]')?.textContent).toContain('Facilities');
  });
});
