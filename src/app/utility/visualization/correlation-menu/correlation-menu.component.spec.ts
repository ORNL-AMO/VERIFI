import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CorrelationMenuComponent } from './correlation-menu.component';

describe('CorrelationMenuComponent', () => {
  let component: CorrelationMenuComponent;
  let fixture: ComponentFixture<CorrelationMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CorrelationMenuComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CorrelationMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
