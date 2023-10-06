import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TotalPortfolioEnergyUseTableComponent } from './total-portfolio-energy-use-table.component';

describe('TotalPortfolioEnergyUseTableComponent', () => {
  let component: TotalPortfolioEnergyUseTableComponent;
  let fixture: ComponentFixture<TotalPortfolioEnergyUseTableComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TotalPortfolioEnergyUseTableComponent]
    });
    fixture = TestBed.createComponent(TotalPortfolioEnergyUseTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
