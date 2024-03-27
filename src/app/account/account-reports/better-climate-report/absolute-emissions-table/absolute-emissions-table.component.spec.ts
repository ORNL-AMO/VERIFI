import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AbsoluteEmissionsTableComponent } from './absolute-emissions-table.component';

describe('AbsoluteEmissionsTableComponent', () => {
  let component: AbsoluteEmissionsTableComponent;
  let fixture: ComponentFixture<AbsoluteEmissionsTableComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AbsoluteEmissionsTableComponent]
    });
    fixture = TestBed.createComponent(AbsoluteEmissionsTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
