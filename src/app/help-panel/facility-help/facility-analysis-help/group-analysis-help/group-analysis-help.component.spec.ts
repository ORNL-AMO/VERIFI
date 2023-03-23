import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupAnalysisHelpComponent } from './group-analysis-help.component';

describe('GroupAnalysisHelpComponent', () => {
  let component: GroupAnalysisHelpComponent;
  let fixture: ComponentFixture<GroupAnalysisHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GroupAnalysisHelpComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GroupAnalysisHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
