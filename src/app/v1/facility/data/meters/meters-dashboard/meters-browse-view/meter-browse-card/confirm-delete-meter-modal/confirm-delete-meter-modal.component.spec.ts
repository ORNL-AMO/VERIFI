import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MeterCardView } from '../../../../facility-meters.models';
import { meter } from '../../../../facility-meters.testing';
import { ConfirmDeleteMeterModalComponent } from './confirm-delete-meter-modal.component';

describe('ConfirmDeleteMeterModalComponent', () => {
  it('summarizes the meter deletion and emits confirmation or cancellation', () => {
    const fixture = TestBed.configureTestingModule({
      imports: [ConfirmDeleteMeterModalComponent]
    }).createComponent(ConfirmDeleteMeterModalComponent);
    fixture.componentInstance.card = {
      meter: meter({ name: 'Main Electric' }),
      readingCount: 2
    } satisfies MeterCardView;
    const confirmed: void[] = [];
    const cancelled: void[] = [];
    fixture.componentInstance.confirmed.subscribe(() => confirmed.push(undefined));
    fixture.componentInstance.cancelled.subscribe(() => cancelled.push(undefined));

    fixture.detectChanges();
    clickButton(fixture, 'Cancel');
    clickButton(fixture, 'Delete meter');

    expect(fixture.nativeElement.textContent).toContain('Delete Main Electric?');
    expect(fixture.nativeElement.textContent).toContain('2 readings');
    expect(cancelled.length).toBe(1);
    expect(confirmed.length).toBe(1);
  });

  it('shows delete errors inside the modal', () => {
    const fixture = TestBed.configureTestingModule({
      imports: [ConfirmDeleteMeterModalComponent]
    }).createComponent(ConfirmDeleteMeterModalComponent);
    fixture.componentInstance.card = {
      meter: meter({ name: 'Main Electric' }),
      readingCount: 2
    } satisfies MeterCardView;
    fixture.componentInstance.error = 'Delete failed.';

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Delete failed.');
    expect(fixture.nativeElement.querySelector('.v1-alert--danger')).not.toBeNull();
  });
});

function clickButton(fixture: ComponentFixture<ConfirmDeleteMeterModalComponent>, label: string): void {
  const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
  buttons.find(button => button.textContent?.includes(label) || button.getAttribute('aria-label')?.includes(label))?.click();
}
