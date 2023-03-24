import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendarizationHelpComponent } from './calendarization-help.component';

describe('CalendarizationHelpComponent', () => {
  let component: CalendarizationHelpComponent;
  let fixture: ComponentFixture<CalendarizationHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CalendarizationHelpComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CalendarizationHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
