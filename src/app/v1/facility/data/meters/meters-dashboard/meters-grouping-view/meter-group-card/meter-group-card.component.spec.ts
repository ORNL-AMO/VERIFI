import { DragDropModule } from '@angular/cdk/drag-drop';
import { CdkDrag } from '@angular/cdk/drag-drop';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MeterCardView } from '../../../facility-meters.models';
import { group, meter } from '../../../facility-meters.testing';
import { MeterGroupCardComponent } from './meter-group-card.component';

describe('MeterGroupCardComponent', () => {
  it('renders compact grouping content and emits title and move actions', () => {
    const fixture = setup({
      sourceColor: '#a59a04',
      scopeLabel: 'Purchased Electricity'
    });
    const opened: MeterCardView[] = [];
    const moved: MeterCardView[] = [];
    fixture.componentInstance.opened.subscribe(card => opened.push(card));
    fixture.componentInstance.moveRequested.subscribe(card => moved.push(card));

    fixture.detectChanges();
    clickButton(fixture, 'Open Electric Main settings');
    clickButton(fixture, 'Move meter');

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Electric Main');
    expect(text).toContain('Source');
    expect(text).toContain('Electricity');
    expect(text).toContain('Scope');
    expect(text).toContain('Purchased Electricity');
    expect(text).not.toContain('Fuel');
    expect(text).not.toContain('Coming soon');
    expect(text).not.toContain('Readings');
    expect(text).not.toContain('Group');
    expect(fixture.nativeElement.querySelector('.v1-meter-group-card h3 .fa-gauge-high')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.v1-meter-group-card__title .fa-chevron-right')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[aria-label="Open Electric Main settings"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[aria-label="Open meter"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('.v1-meter-group-card__actions [aria-label="Drag meter"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.v1-meter-group-card__header [aria-label="Drag meter"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('.v1-meter-group-card__source')?.getAttribute('style')).toContain('#a59a04');
    expect(opened[0]).toBe(fixture.componentInstance.card);
    expect(moved[0]).toBe(fixture.componentInstance.card);
  });

  it('renders fuel only when fuel is available', () => {
    const fixture = setup({
      meter: meter({
        guid: 'meter-fuel',
        name: 'Backup Fuel',
        source: 'Other Fuels',
        fuel: 'Propane',
        scope: 1
      }),
      scopeLabel: 'Stationary combustion',
      fuelLabel: 'Propane'
    });

    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Backup Fuel');
    expect(text).toContain('Fuel');
    expect(text).toContain('Propane');
  });

  it('keeps the drag preview in the drop lane so the card surface travels with it', () => {
    const fixture = setup();

    fixture.detectChanges();

    const drag = fixture.debugElement.query(By.directive(CdkDrag)).injector.get(CdkDrag);
    expect(drag.previewContainer).toBe('parent');
  });
});

function setup(card: Partial<MeterCardView> = {}): ComponentFixture<MeterGroupCardComponent> {
  const fixture = TestBed.configureTestingModule({
    imports: [DragDropModule, MeterGroupCardComponent]
  }).createComponent(MeterGroupCardComponent);
  const energyGroup = group({ guid: 'group-energy', name: 'Electricity' });
  fixture.componentInstance.card = {
    meter: meter({ guid: 'meter-electric', name: 'Electric Main', groupId: energyGroup.guid }),
    group: energyGroup,
    readingCount: 3,
    ...card
  };
  return fixture;
}

function clickButton(fixture: ComponentFixture<MeterGroupCardComponent>, label: string): void {
  const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
  buttons.find(button => button.textContent?.includes(label) || button.getAttribute('aria-label')?.includes(label))?.click();
}
