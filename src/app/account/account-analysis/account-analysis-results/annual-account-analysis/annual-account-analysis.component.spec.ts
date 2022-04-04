import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnnualAccountAnalysisComponent } from './annual-account-analysis.component';

describe('AnnualAccountAnalysisComponent', () => {
  let component: AnnualAccountAnalysisComponent;
  let fixture: ComponentFixture<AnnualAccountAnalysisComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AnnualAccountAnalysisComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AnnualAccountAnalysisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
