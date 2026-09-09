import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MeterCardView } from '../../facility-meters.models';
import { group, meter } from '../../facility-meters.testing';
import { MeterBrowseCardComponent } from './meter-browse-card.component';

describe('MeterBrowseCardComponent', () => {
  it('renders meter summary with a footer group tag and no drag controls', () => {
    const fixture = setup({
      meter: meter({ name: 'Main Electric', source: 'Electricity' }),
      group: group({ name: 'Purchased Electricity' }),
      readingCount: 4
    });

    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Main Electric');
    expect(text).toContain('Electricity');
    expect(text).toContain('Purchased Electricity');
    expect(text).toContain('4');
    expect(text).toContain('Coming soon');
    expect(fixture.nativeElement.querySelector('[cdkdrag]')).toBeNull();
    expect(text).not.toContain('Move meter');
  });

  it('emits when the meter is opened', () => {
    const fixture = setup({
      meter: meter({ guid: 'meter-a' }),
      readingCount: 0
    });
    const opened: MeterCardView[] = [];
    fixture.componentInstance.opened.subscribe(card => opened.push(card));

    fixture.detectChanges();
    (fixture.nativeElement.querySelector('[aria-label="Open meter"]') as HTMLButtonElement).click();

    expect(opened[0].meter.guid).toBe('meter-a');
  });
});

function setup(card: MeterCardView): ComponentFixture<MeterBrowseCardComponent> {
  TestBed.configureTestingModule({
    imports: [MeterBrowseCardComponent]
  });
  const fixture = TestBed.createComponent(MeterBrowseCardComponent);
  fixture.componentInstance.card = card;
  return fixture;
}
