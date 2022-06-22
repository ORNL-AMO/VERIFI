import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UtilityMetersTableComponent } from './utility-meters-table.component';

describe('UtilityMetersTableComponent', () => {
  let component: UtilityMetersTableComponent;
  let fixture: ComponentFixture<UtilityMetersTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UtilityMetersTableComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UtilityMetersTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
