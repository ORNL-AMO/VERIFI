import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TopPerformersTableComponent } from './top-performers-table.component';

describe('TopPerformersTableComponent', () => {
  let component: TopPerformersTableComponent;
  let fixture: ComponentFixture<TopPerformersTableComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TopPerformersTableComponent]
    });
    fixture = TestBed.createComponent(TopPerformersTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
