import { CdkDragDrop, CdkDropList, DragDropModule } from '@angular/cdk/drag-drop';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { buildMeterGroupSections, MeterCardView } from '../../../facility-meters.models';
import { group, meter } from '../../../facility-meters.testing';
import { MeterGroupLaneComponent } from './meter-group-lane.component';

describe('MeterGroupLaneComponent', () => {
  it('renders a flat lane and emits valid meter drops', () => {
    const energyGroup = group({ guid: 'group-energy', name: 'Electricity' });
    const cardMeter = meter({ guid: 'meter-electric', name: 'Electric Main', groupId: energyGroup.guid });
    const section = buildMeterGroupSections([cardMeter], [], [energyGroup])[0];
    const fixture = setup(section);
    const drops: unknown[] = [];
    fixture.componentInstance.meterDropped.subscribe(event => drops.push(event));

    fixture.detectChanges();
    fixture.componentInstance.onDrop({ item: { data: section.meters[0] } } as CdkDragDrop<readonly MeterCardView[]>);

    expect(fixture.nativeElement.textContent).toContain('Electricity');
    expect(fixture.nativeElement.querySelector('.v1-meter-lane')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.v1-meter-lane__group-icon.fa-layer-group')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-meter-group-card')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.v1-meter-group')).toBeNull();
    expect(drops[0]).toEqual({ card: section.meters[0], target: { id: energyGroup.guid, label: 'Electricity', group: energyGroup } });
  });

  it('emits move requests from compact meter group cards', () => {
    const energyGroup = group({ guid: 'group-energy', name: 'Electricity' });
    const cardMeter = meter({ guid: 'meter-electric', name: 'Electric Main', groupId: energyGroup.guid });
    const section = buildMeterGroupSections([cardMeter], [], [energyGroup])[0];
    const fixture = setup(section);
    const moved: MeterCardView[] = [];
    fixture.componentInstance.moveMeter.subscribe(card => moved.push(card));

    fixture.detectChanges();
    clickButton(fixture, 'Move meter');

    expect(moved[0]).toBe(section.meters[0]);
  });

  it('emits open requests from compact meter group card titles', () => {
    const energyGroup = group({ guid: 'group-energy', name: 'Electricity' });
    const cardMeter = meter({ guid: 'meter-electric', name: 'Electric Main', groupId: energyGroup.guid });
    const section = buildMeterGroupSections([cardMeter], [], [energyGroup])[0];
    const fixture = setup(section);
    const opened: MeterCardView[] = [];
    fixture.componentInstance.openMeter.subscribe(card => opened.push(card));

    fixture.detectChanges();
    clickButton(fixture, 'Open Electric Main settings');

    expect(opened[0]).toBe(section.meters[0]);
  });

  it('keeps CDK auto-scroll enabled for long grouped meter dashboards', () => {
    const energyGroup = group({ guid: 'group-energy', name: 'Electricity' });
    const section = buildMeterGroupSections([], [], [energyGroup])[0];
    const fixture = setup(section);

    fixture.detectChanges();

    const dropList = fixture.debugElement.query(By.directive(CdkDropList)).injector.get(CdkDropList);
    expect(dropList.autoScrollDisabled).toBe(false);
    expect(dropList.autoScrollStep).toBe(24);
  });

  it('does not emit invalid or disabled drops', () => {
    const waterGroup = group({ guid: 'group-water', name: 'Water', groupType: 'Water' });
    const cardMeter = meter({ guid: 'meter-electric', name: 'Electric Main', source: 'Electricity', groupId: undefined });
    const section = buildMeterGroupSections([cardMeter], [], [waterGroup])[0];
    const fixture = setup(section);
    const drops: unknown[] = [];
    fixture.componentInstance.canDrop = () => false;
    fixture.componentInstance.meterDropped.subscribe(event => drops.push(event));

    fixture.componentInstance.onDrop({ item: { data: section.meters[0] } } as CdkDragDrop<readonly MeterCardView[]>);

    expect(drops).toEqual([]);
  });
});

function setup(section: ReturnType<typeof buildMeterGroupSections>[number]): ComponentFixture<MeterGroupLaneComponent> {
  const fixture = TestBed.configureTestingModule({
    imports: [DragDropModule, MeterGroupLaneComponent]
  }).createComponent(MeterGroupLaneComponent);
  fixture.componentInstance.section = section;
  fixture.componentInstance.canWrite = true;
  fixture.componentInstance.canDrop = () => true;
  return fixture;
}

function clickButton(fixture: ComponentFixture<MeterGroupLaneComponent>, label: string): void {
  const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
  buttons.find(button => button.textContent?.includes(label) || button.getAttribute('aria-label')?.includes(label))?.click();
}
