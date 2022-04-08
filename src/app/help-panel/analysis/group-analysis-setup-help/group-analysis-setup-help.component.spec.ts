import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupAnalysisSetupHelpComponent } from './group-analysis-setup-help.component';

describe('GroupAnalysisSetupHelpComponent', () => {
  let component: GroupAnalysisSetupHelpComponent;
  let fixture: ComponentFixture<GroupAnalysisSetupHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GroupAnalysisSetupHelpComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GroupAnalysisSetupHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
