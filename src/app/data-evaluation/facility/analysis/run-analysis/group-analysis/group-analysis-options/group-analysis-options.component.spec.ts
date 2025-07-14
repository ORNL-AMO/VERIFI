import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupAnalysisOptionsComponent } from './group-analysis-options.component';

describe('GroupAnalysisOptionsComponent', () => {
  let component: GroupAnalysisOptionsComponent;
  let fixture: ComponentFixture<GroupAnalysisOptionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GroupAnalysisOptionsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GroupAnalysisOptionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
