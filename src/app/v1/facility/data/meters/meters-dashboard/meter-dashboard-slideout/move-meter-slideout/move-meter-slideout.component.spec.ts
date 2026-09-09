import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MeterGroupDropTarget } from '../../../facility-meters.models';
import { group, meter } from '../../../facility-meters.testing';
import { MoveMeterSlideoutComponent } from './move-meter-slideout.component';

describe('MoveMeterSlideoutComponent', () => {
  it('emits the selected valid move target', () => {
    const targetGroup = group({ guid: 'group-energy', name: 'Electricity', groupType: 'Energy' });
    const fixture = setup([{ id: 'ungrouped', label: 'Ungrouped' }, { id: targetGroup.guid, label: targetGroup.name, group: targetGroup }]);
    const submitted: MeterGroupDropTarget[] = [];
    fixture.componentInstance.submitted.subscribe(target => submitted.push(target));

    fixture.detectChanges();
    setSelect(fixture, targetGroup.guid);
    fixture.detectChanges();
    findButton(fixture, 'Move meter')?.click();

    expect(submitted[0]).toEqual({ id: targetGroup.guid, label: targetGroup.name, group: targetGroup });
  });
});

function setup(targets: MeterGroupDropTarget[]): ComponentFixture<MoveMeterSlideoutComponent> {
  const fixture = TestBed.configureTestingModule({
    imports: [MoveMeterSlideoutComponent]
  }).createComponent(MoveMeterSlideoutComponent);
  fixture.componentInstance.card = {
    meter: meter({ guid: 'meter-electric', name: 'Electric Main', groupId: undefined, source: 'Electricity' }),
    readingCount: 0
  };
  fixture.componentInstance.targets = targets;
  fixture.componentInstance.ngOnChanges({ targets: {} as any, card: {} as any });
  return fixture;
}

function setSelect(fixture: ComponentFixture<MoveMeterSlideoutComponent>, value: string): void {
  const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
  select.value = value;
  select.dispatchEvent(new Event('change'));
}

function findButton(fixture: ComponentFixture<MoveMeterSlideoutComponent>, label: string): HTMLButtonElement | undefined {
  const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
  return buttons.find(button => button.textContent?.includes(label));
}
