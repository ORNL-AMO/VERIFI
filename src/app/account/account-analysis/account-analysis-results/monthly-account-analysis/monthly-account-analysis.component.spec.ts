import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonthlyAccountAnalysisComponent } from './monthly-account-analysis.component';

describe('MonthlyAccountAnalysisComponent', () => {
  let component: MonthlyAccountAnalysisComponent;
  let fixture: ComponentFixture<MonthlyAccountAnalysisComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MonthlyAccountAnalysisComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MonthlyAccountAnalysisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
