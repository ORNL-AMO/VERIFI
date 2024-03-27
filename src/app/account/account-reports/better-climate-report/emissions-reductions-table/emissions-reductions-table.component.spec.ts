import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmissionsReductionsTableComponent } from './emissions-reductions-table.component';

describe('EmissionsReductionsTableComponent', () => {
  let component: EmissionsReductionsTableComponent;
  let fixture: ComponentFixture<EmissionsReductionsTableComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [EmissionsReductionsTableComponent]
    });
    fixture = TestBed.createComponent(EmissionsReductionsTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
