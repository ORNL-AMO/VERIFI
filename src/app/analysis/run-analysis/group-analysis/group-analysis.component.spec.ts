import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupAnalysisComponent } from './group-analysis.component';

describe('GroupAnalysisComponent', () => {
  let component: GroupAnalysisComponent;
  let fixture: ComponentFixture<GroupAnalysisComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GroupAnalysisComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GroupAnalysisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
