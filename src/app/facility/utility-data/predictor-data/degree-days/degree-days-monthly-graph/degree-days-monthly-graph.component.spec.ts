import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DegreeDaysMonthlyGraphComponent } from './degree-days-monthly-graph.component';

describe('DegreeDaysMonthlyGraphComponent', () => {
  let component: DegreeDaysMonthlyGraphComponent;
  let fixture: ComponentFixture<DegreeDaysMonthlyGraphComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DegreeDaysMonthlyGraphComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DegreeDaysMonthlyGraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
