import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonthlyStationHelpComponent } from './monthly-station-help.component';

describe('MonthlyStationHelpComponent', () => {
  let component: MonthlyStationHelpComponent;
  let fixture: ComponentFixture<MonthlyStationHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MonthlyStationHelpComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MonthlyStationHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
