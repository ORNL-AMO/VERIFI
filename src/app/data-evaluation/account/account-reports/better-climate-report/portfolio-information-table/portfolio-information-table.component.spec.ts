import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PortfolioInformationTableComponent } from './portfolio-information-table.component';

describe('PortfolioInformationTableComponent', () => {
  let component: PortfolioInformationTableComponent;
  let fixture: ComponentFixture<PortfolioInformationTableComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PortfolioInformationTableComponent]
    });
    fixture = TestBed.createComponent(PortfolioInformationTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
