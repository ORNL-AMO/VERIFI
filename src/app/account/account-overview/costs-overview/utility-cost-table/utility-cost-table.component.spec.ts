import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UtilityCostTableComponent } from './utility-cost-table.component';

describe('UtilityCostTableComponent', () => {
  let component: UtilityCostTableComponent;
  let fixture: ComponentFixture<UtilityCostTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UtilityCostTableComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UtilityCostTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
