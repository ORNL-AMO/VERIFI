import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { reading } from '@app/v1/facility/data/meters/facility-meters.testing';
import { MeterReadingsConfirmation } from '../meter-workbench-readings.models';
import { MeterReadingsConfirmationModalComponent } from './meter-readings-confirmation-modal.component';

describe('MeterReadingsConfirmationModalComponent', () => {
  it.each([
    [{ kind: 'delete-one', reading: reading({}) }, 'Deleting this meter reading cannot be undone.', 'Delete'],
    [{ kind: 'delete-many', readings: [reading({}), reading({ guid: 'reading-b' })] }, 'Deleting 2 selected meter readings cannot be undone.', 'Delete Selected'],
    [{ kind: 'fill-missing', count: 3 }, 'Zero-valued meter readings will be added for 3 missing months.', 'Fill with Zeros']
  ] as const)('renders the %s confirmation', (confirmation, description, actionLabel) => {
    const fixture = setup(confirmation);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain(description);
    expect(actionButton(fixture).textContent).toContain(actionLabel);
  });

  it('emits confirmation and cancellation while enabled', () => {
    const fixture = setup({ kind: 'delete-one', reading: reading({}) });
    const confirmed = vi.fn();
    const cancelled = vi.fn();
    fixture.componentInstance.confirmed.subscribe(confirmed);
    fixture.componentInstance.cancelled.subscribe(cancelled);

    actionButton(fixture).click();
    const cancelButton = fixture.debugElement.queryAll(By.css('button'))
      .find(button => (button.nativeElement as HTMLButtonElement).textContent?.trim() === 'Cancel');
    (cancelButton?.nativeElement as HTMLButtonElement).click();

    expect(confirmed).toHaveBeenCalledOnce();
    expect(cancelled).toHaveBeenCalledOnce();
  });

  it('disables every modal action while saving', () => {
    const fixture = setup({ kind: 'fill-missing', count: 1 }, true);

    expect(fixture.debugElement.queryAll(By.css('button'))
      .every(button => (button.nativeElement as HTMLButtonElement).disabled)).toBe(true);
  });
});

function setup(
  confirmation: MeterReadingsConfirmation,
  saving = false
): ComponentFixture<MeterReadingsConfirmationModalComponent> {
  TestBed.configureTestingModule({ imports: [MeterReadingsConfirmationModalComponent] });
  const fixture = TestBed.createComponent(MeterReadingsConfirmationModalComponent);
  fixture.componentRef.setInput('confirmation', confirmation);
  fixture.componentRef.setInput('saving', saving);
  fixture.detectChanges();
  return fixture;
}

function actionButton(fixture: ComponentFixture<MeterReadingsConfirmationModalComponent>): HTMLButtonElement {
  return fixture.nativeElement.querySelector('.v1-modal__footer .v1-btn--danger') as HTMLButtonElement;
}
