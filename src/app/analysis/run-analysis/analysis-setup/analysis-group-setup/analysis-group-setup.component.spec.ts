import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnalysisGroupSetupComponent } from './analysis-group-setup.component';

describe('AnalysisGroupSetupComponent', () => {
  let component: AnalysisGroupSetupComponent;
  let fixture: ComponentFixture<AnalysisGroupSetupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AnalysisGroupSetupComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AnalysisGroupSetupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
