import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IdentifyColumnsComponent } from './identify-columns.component';

describe('IdentifyColumnsComponent', () => {
  let component: IdentifyColumnsComponent;
  let fixture: ComponentFixture<IdentifyColumnsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ IdentifyColumnsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IdentifyColumnsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
