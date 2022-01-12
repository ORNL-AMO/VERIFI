import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnalysisSetupComponent } from './analysis-setup.component';

describe('AnalysisSetupComponent', () => {
  let component: AnalysisSetupComponent;
  let fixture: ComponentFixture<AnalysisSetupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AnalysisSetupComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AnalysisSetupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
