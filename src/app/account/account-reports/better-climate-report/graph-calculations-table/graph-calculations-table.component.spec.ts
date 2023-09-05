import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GraphCalculationsTableComponent } from './graph-calculations-table.component';

describe('GraphCalculationsTableComponent', () => {
  let component: GraphCalculationsTableComponent;
  let fixture: ComponentFixture<GraphCalculationsTableComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [GraphCalculationsTableComponent]
    });
    fixture = TestBed.createComponent(GraphCalculationsTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
