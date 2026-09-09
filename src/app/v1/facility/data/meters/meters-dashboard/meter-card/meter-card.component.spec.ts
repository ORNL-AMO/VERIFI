import { DragDropModule } from '@angular/cdk/drag-drop';
import { CdkDrag } from '@angular/cdk/drag-drop';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MeterCardView } from '../../facility-meters.models';
import { group, meter } from '../../facility-meters.testing';
import { MeterCardComponent } from './meter-card.component';

describe('MeterCardComponent', () => {
  it('renders placeholder meter content and emits card actions', () => {
    const fixture = setup();
    const opened: MeterCardView[] = [];
    const moved: MeterCardView[] = [];
    fixture.componentInstance.opened.subscribe(card => opened.push(card));
    fixture.componentInstance.moveRequested.subscribe(card => moved.push(card));

    fixture.detectChanges();
    clickButton(fixture, 'Open meter');
    clickButton(fixture, 'Move meter');

    expect(fixture.nativeElement.textContent).toContain('Electric Main');
    expect(fixture.nativeElement.textContent).toContain('Coming soon');
    expect(fixture.nativeElement.querySelector('.v1-meter-card h3 .fa-gauge-high')).not.toBeNull();
    expect(opened[0]).toBe(fixture.componentInstance.card);
    expect(moved[0]).toBe(fixture.componentInstance.card);
  });

  it('keeps the drag preview in the drop lane so the card surface travels with it', () => {
    const fixture = setup();

    fixture.detectChanges();

    const drag = fixture.debugElement.query(By.directive(CdkDrag)).injector.get(CdkDrag);
    expect(drag.previewContainer).toBe('parent');
  });
});

function setup(): ComponentFixture<MeterCardComponent> {
  const fixture = TestBed.configureTestingModule({
    imports: [DragDropModule, MeterCardComponent]
  }).createComponent(MeterCardComponent);
  const energyGroup = group({ guid: 'group-energy', name: 'Electricity' });
  fixture.componentInstance.card = {
    meter: meter({ guid: 'meter-electric', name: 'Electric Main', groupId: energyGroup.guid }),
    group: energyGroup,
    readingCount: 3
  };
  return fixture;
}

function clickButton(fixture: ComponentFixture<MeterCardComponent>, label: string): void {
  const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
  buttons.find(button => button.textContent?.includes(label) || button.getAttribute('aria-label')?.includes(label))?.click();
}
