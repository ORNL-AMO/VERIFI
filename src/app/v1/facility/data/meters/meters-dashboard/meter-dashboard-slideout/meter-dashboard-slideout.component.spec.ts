import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MeterDashboardSlideoutComponent } from './meter-dashboard-slideout.component';

describe('MeterDashboardSlideoutComponent', () => {
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
});

function setup(): ComponentFixture<MeterDashboardSlideoutComponent> {
  const fixture = TestBed.configureTestingModule({
    imports: [MeterDashboardSlideoutComponent]
  }).createComponent(MeterDashboardSlideoutComponent);
  fixture.componentInstance.title = 'Add meter';
  return fixture;
}

function backdropButton(fixture: ComponentFixture<MeterDashboardSlideoutComponent>): HTMLButtonElement {
  return fixture.nativeElement.querySelector('.v1-meter-slideout-backdrop') as HTMLButtonElement;
}

function closeButton(fixture: ComponentFixture<MeterDashboardSlideoutComponent>): HTMLButtonElement {
  return fixture.nativeElement.querySelector('.v1-meter-slideout__header .v1-icon-btn') as HTMLButtonElement;
}
