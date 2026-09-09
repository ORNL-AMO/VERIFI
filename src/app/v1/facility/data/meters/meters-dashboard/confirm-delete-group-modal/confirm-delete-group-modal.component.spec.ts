import { ComponentFixture, TestBed } from '@angular/core/testing';
import { group } from '../../facility-meters.testing';
import { ConfirmDeleteGroupModalComponent } from './confirm-delete-group-modal.component';

describe('ConfirmDeleteGroupModalComponent', () => {
  it('confirms or cancels group deletion without form fields', () => {
    const fixture = TestBed.configureTestingModule({
      imports: [ConfirmDeleteGroupModalComponent]
    }).createComponent(ConfirmDeleteGroupModalComponent);
    const confirmed: void[] = [];
    const cancelled: void[] = [];
    fixture.componentInstance.group = group({ guid: 'group-energy', name: 'Electricity' });
    fixture.componentInstance.assignedMeterCount = 2;
    fixture.componentInstance.confirmed.subscribe(() => confirmed.push(undefined));
    fixture.componentInstance.cancelled.subscribe(() => cancelled.push(undefined));

    fixture.detectChanges();
    clickButton(fixture, 'Delete group');
    clickButton(fixture, 'Cancel');

    expect(fixture.nativeElement.querySelector('input')).toBeNull();
    expect(confirmed.length).toBe(1);
    expect(cancelled.length).toBe(1);
  });
});

function clickButton(fixture: ComponentFixture<ConfirmDeleteGroupModalComponent>, label: string): void {
  const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
  buttons.find(button => button.textContent?.includes(label))?.click();
}
