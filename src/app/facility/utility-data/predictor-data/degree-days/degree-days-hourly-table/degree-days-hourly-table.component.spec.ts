import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DegreeDaysHourlyTableComponent } from './degree-days-hourly-table.component';

describe('DegreeDaysHourlyTableComponent', () => {
  let component: DegreeDaysHourlyTableComponent;
  let fixture: ComponentFixture<DegreeDaysHourlyTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DegreeDaysHourlyTableComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DegreeDaysHourlyTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
