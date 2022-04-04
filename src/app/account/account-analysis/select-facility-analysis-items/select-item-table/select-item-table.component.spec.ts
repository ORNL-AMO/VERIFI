import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectItemTableComponent } from './select-item-table.component';

describe('SelectItemTableComponent', () => {
  let component: SelectItemTableComponent;
  let fixture: ComponentFixture<SelectItemTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SelectItemTableComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SelectItemTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
