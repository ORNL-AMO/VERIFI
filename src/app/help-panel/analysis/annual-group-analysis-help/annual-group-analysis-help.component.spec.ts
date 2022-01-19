import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnnualGroupAnalysisHelpComponent } from './annual-group-analysis-help.component';

describe('AnnualGroupAnalysisHelpComponent', () => {
  let component: AnnualGroupAnalysisHelpComponent;
  let fixture: ComponentFixture<AnnualGroupAnalysisHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AnnualGroupAnalysisHelpComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AnnualGroupAnalysisHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
