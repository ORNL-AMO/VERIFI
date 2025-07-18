import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalanderizedMeterDataTableComponent } from './calanderized-meter-data-table.component';

describe('CalanderizedMeterDataTableComponent', () => {
  let component: CalanderizedMeterDataTableComponent;
  let fixture: ComponentFixture<CalanderizedMeterDataTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CalanderizedMeterDataTableComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CalanderizedMeterDataTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
