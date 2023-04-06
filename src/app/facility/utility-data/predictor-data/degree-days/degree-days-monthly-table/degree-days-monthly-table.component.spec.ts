import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DegreeDaysMonthlyTableComponent } from './degree-days-monthly-table.component';

describe('DegreeDaysMonthlyTableComponent', () => {
  let component: DegreeDaysMonthlyTableComponent;
  let fixture: ComponentFixture<DegreeDaysMonthlyTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DegreeDaysMonthlyTableComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DegreeDaysMonthlyTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
