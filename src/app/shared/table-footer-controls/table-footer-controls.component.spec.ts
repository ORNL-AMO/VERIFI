import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableFooterControlsComponent } from './table-footer-controls.component';

describe('TableFooterControlsComponent', () => {
  let component: TableFooterControlsComponent;
  let fixture: ComponentFixture<TableFooterControlsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TableFooterControlsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TableFooterControlsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
