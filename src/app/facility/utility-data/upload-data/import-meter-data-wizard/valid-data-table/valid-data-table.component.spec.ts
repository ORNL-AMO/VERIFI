import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ValidDataTableComponent } from './valid-data-table.component';

describe('ValidDataTableComponent', () => {
  let component: ValidDataTableComponent;
  let fixture: ComponentFixture<ValidDataTableComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ValidDataTableComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ValidDataTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
