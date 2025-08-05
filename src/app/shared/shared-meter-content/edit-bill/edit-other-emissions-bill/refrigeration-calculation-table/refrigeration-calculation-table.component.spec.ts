import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RefrigerationCalculationTableComponent } from './refrigeration-calculation-table.component';

describe('RefrigerationCalculationTableComponent', () => {
  let component: RefrigerationCalculationTableComponent;
  let fixture: ComponentFixture<RefrigerationCalculationTableComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [RefrigerationCalculationTableComponent]
    });
    fixture = TestBed.createComponent(RefrigerationCalculationTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
