import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnalysisSetupHelpComponent } from './analysis-setup-help.component';

describe('AnalysisSetupHelpComponent', () => {
  let component: AnalysisSetupHelpComponent;
  let fixture: ComponentFixture<AnalysisSetupHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AnalysisSetupHelpComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AnalysisSetupHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
