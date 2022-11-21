import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableItemsDropdownComponent } from './table-items-dropdown.component';

describe('TableItemsDropdownComponent', () => {
  let component: TableItemsDropdownComponent;
  let fixture: ComponentFixture<TableItemsDropdownComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TableItemsDropdownComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TableItemsDropdownComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
