import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TopEmissionsPerformersTableComponent } from './top-emissions-performers-table.component';

describe('TopEmissionsPerformersTableComponent', () => {
  let component: TopEmissionsPerformersTableComponent;
  let fixture: ComponentFixture<TopEmissionsPerformersTableComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TopEmissionsPerformersTableComponent]
    });
    fixture = TestBed.createComponent(TopEmissionsPerformersTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
