import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MeterGroupDraft } from '../../../facility-meters.models';
import { group } from '../../../facility-meters.testing';
import { MeterGroupDraftSlideoutComponent } from './meter-group-draft-slideout.component';

describe('MeterGroupDraftSlideoutComponent', () => {
  it('validates required fields and emits group drafts', () => {
    const fixture = setup();
    const submitted: MeterGroupDraft[] = [];
    fixture.componentInstance.submitted.subscribe(draft => submitted.push(draft));

    fixture.detectChanges();
    expect(findButton(fixture, 'Add group')?.disabled).toBe(true);

    setInput(fixture, 'input', 'Water');
    fixture.detectChanges();
    submitForm(fixture);

    expect(submitted[0]).toMatchObject({ name: 'Water', groupType: 'Energy' });
  });

  it('disables group type changes when the group has assigned meters and emits delete requests', () => {
    const existing = group({ guid: 'group-energy', name: 'Electricity', groupType: 'Energy' });
    const fixture = setup();
    const deleteRequests: unknown[] = [];
    fixture.componentInstance.group = existing;
    fixture.componentInstance.assignedMeterCount = 2;
    fixture.componentInstance.deleteRequested.subscribe(groupToDelete => deleteRequests.push(groupToDelete));

    fixture.detectChanges();
    fixture.componentInstance.ngOnChanges({ group: {} as any });
    fixture.detectChanges();
    findButton(fixture, 'Delete group')?.click();

    expect(fixture.nativeElement.querySelector('select').disabled).toBe(true);
    expect(deleteRequests[0]).toBe(existing);
  });
});

function setup(): ComponentFixture<MeterGroupDraftSlideoutComponent> {
  return TestBed.configureTestingModule({
    imports: [MeterGroupDraftSlideoutComponent]
  }).createComponent(MeterGroupDraftSlideoutComponent);
}

function setInput(fixture: ComponentFixture<MeterGroupDraftSlideoutComponent>, selector: string, value: string): void {
  const input = fixture.nativeElement.querySelector(selector) as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

function submitForm(fixture: ComponentFixture<MeterGroupDraftSlideoutComponent>): void {
  const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
  form.dispatchEvent(new Event('submit'));
}

function findButton(fixture: ComponentFixture<MeterGroupDraftSlideoutComponent>, label: string): HTMLButtonElement | undefined {
  const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
  return buttons.find(button => button.textContent?.includes(label));
}
