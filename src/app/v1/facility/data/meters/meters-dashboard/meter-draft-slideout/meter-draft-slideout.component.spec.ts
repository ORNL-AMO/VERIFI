import { ComponentFixture, TestBed } from '@angular/core/testing';
import { group } from '../../facility-meters.testing';
import { MeterDraft } from '../../facility-meters.models';
import { MeterDraftSlideoutComponent } from './meter-draft-slideout.component';

describe('MeterDraftSlideoutComponent', () => {
  it('validates required fields and emits the meter draft', () => {
    const fixture = setup();
    const submitted: MeterDraft[] = [];
    fixture.componentInstance.submitted.subscribe(draft => submitted.push(draft));

    fixture.detectChanges();
    expect(findButton(fixture, 'Add meter')?.disabled).toBe(true);

    setInput(fixture, 'input', 'Boiler Gas');
    fixture.componentInstance.setSource({ target: { value: 'Natural Gas' } } as unknown as Event);
    fixture.detectChanges();
    submitForm(fixture);

    expect(submitted[0]).toMatchObject({ name: 'Boiler Gas', source: 'Natural Gas' });
  });

  it('disables incompatible group options for the selected source', () => {
    const fixture = setup();
    fixture.componentInstance.groups = [group({ guid: 'group-water', name: 'Water', groupType: 'Water' })];

    fixture.detectChanges();

    const groupSelect = fixture.nativeElement.querySelectorAll('select')[1] as HTMLSelectElement;
    const waterOption = Array.from(groupSelect.options)
      .find((option: HTMLOptionElement) => option.textContent?.includes('Water')) as HTMLOptionElement;
    expect(waterOption.disabled).toBe(true);
  });
});

function setup(): ComponentFixture<MeterDraftSlideoutComponent> {
  return TestBed.configureTestingModule({
    imports: [MeterDraftSlideoutComponent]
  }).createComponent(MeterDraftSlideoutComponent);
}

function setInput(fixture: ComponentFixture<MeterDraftSlideoutComponent>, selector: string, value: string): void {
  const input = fixture.nativeElement.querySelector(selector) as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

function submitForm(fixture: ComponentFixture<MeterDraftSlideoutComponent>): void {
  const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
  form.dispatchEvent(new Event('submit'));
}

function findButton(fixture: ComponentFixture<MeterDraftSlideoutComponent>, label: string): HTMLButtonElement | undefined {
  const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
  return buttons.find(button => button.textContent?.includes(label));
}
