import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MeterChargesCorrelationsComponent } from './meter-charges-correlations.component';

describe('MeterChargesCorrelationsComponent', () => {
  let component: MeterChargesCorrelationsComponent;
  let fixture: ComponentFixture<MeterChargesCorrelationsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MeterChargesCorrelationsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MeterChargesCorrelationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
