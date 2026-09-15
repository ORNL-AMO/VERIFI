import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MeterSlideoutComponent } from './meter-slideout.component';

describe('MeterSlideoutComponent', () => {
  it('emits close requests from the backdrop and header close button', () => {
    const fixture = setup();
    const closed: void[] = [];
    fixture.componentInstance.closed.subscribe(() => closed.push(undefined));

    fixture.detectChanges();
    backdropButton(fixture).click();
    closeButton(fixture).click();

    expect(closed.length).toBe(2);
  });

  it('keeps all close controls disabled while saving', () => {
    const fixture = setup();
    const closed: void[] = [];
    fixture.componentInstance.saving = true;
    fixture.componentInstance.closed.subscribe(() => closed.push(undefined));

    fixture.detectChanges();
    backdropButton(fixture).click();
    closeButton(fixture).click();

    expect(backdropButton(fixture).disabled).toBe(true);
    expect(closeButton(fixture).disabled).toBe(true);
    expect(closed).toEqual([]);
  });

  it('supports a large width for dense slideout content', () => {
    const fixture = setup();

    fixture.componentInstance.size = 'large';
    fixture.detectChanges();

    const slideout = fixture.nativeElement.querySelector('.v1-meter-slideout') as HTMLElement;
    expect(slideout.classList.contains('v1-meter-slideout--large')).toBe(true);
  });
});

function setup(): ComponentFixture<MeterSlideoutComponent> {
  const fixture = TestBed.configureTestingModule({
    imports: [MeterSlideoutComponent]
  }).createComponent(MeterSlideoutComponent);
  fixture.componentInstance.title = 'Add meter';
  return fixture;
}

function backdropButton(fixture: ComponentFixture<MeterSlideoutComponent>): HTMLButtonElement {
  return fixture.nativeElement.querySelector('.v1-meter-slideout-backdrop') as HTMLButtonElement;
}

function closeButton(fixture: ComponentFixture<MeterSlideoutComponent>): HTMLButtonElement {
  return fixture.nativeElement.querySelector('.v1-meter-slideout__header .v1-icon-btn') as HTMLButtonElement;
}
