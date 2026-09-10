import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MeterCardView } from '../../../../facility-meters.models';
import { meter } from '../../../../facility-meters.testing';
import { ConfirmCopyMeterModalComponent } from './confirm-copy-meter-modal.component';

describe('ConfirmCopyMeterModalComponent', () => {
  it('summarizes the meter copy and emits confirmation or cancellation', () => {
    const fixture = TestBed.configureTestingModule({
      imports: [ConfirmCopyMeterModalComponent]
    }).createComponent(ConfirmCopyMeterModalComponent);
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
    clickButton(fixture, 'Copy meter');

    expect(fixture.nativeElement.textContent).toContain('Copy Main Electric?');
    expect(fixture.nativeElement.textContent).toContain('Readings will not be copied.');
    expect(findButton(fixture, 'Copy meter')?.classList.contains('v1-btn--action')).toBe(true);
    expect(cancelled.length).toBe(1);
    expect(confirmed.length).toBe(1);
  });

  it('shows copy errors inside the modal', () => {
    const fixture = TestBed.configureTestingModule({
      imports: [ConfirmCopyMeterModalComponent]
    }).createComponent(ConfirmCopyMeterModalComponent);
    fixture.componentInstance.card = {
      meter: meter({ name: 'Main Electric' }),
      readingCount: 2
    } satisfies MeterCardView;
    fixture.componentInstance.error = 'Copy failed.';

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Copy failed.');
    expect(fixture.nativeElement.querySelector('.v1-alert--danger')).not.toBeNull();
  });
});

function clickButton(fixture: ComponentFixture<ConfirmCopyMeterModalComponent>, label: string): void {
  findButton(fixture, label)?.click();
}

function findButton(fixture: ComponentFixture<ConfirmCopyMeterModalComponent>, label: string): HTMLButtonElement | undefined {
  const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
  return buttons.find(button => button.textContent?.includes(label) || button.getAttribute('aria-label')?.includes(label));
}
