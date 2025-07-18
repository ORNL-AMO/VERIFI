import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SharedMeterCalendarizationComponent } from './shared-meter-calendarization.component';

describe('SharedMeterCalendarizationComponent', () => {
  let component: SharedMeterCalendarizationComponent;
  let fixture: ComponentFixture<SharedMeterCalendarizationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SharedMeterCalendarizationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SharedMeterCalendarizationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
