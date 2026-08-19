import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { V1ShellComponent } from './v1-shell.component';

@NgModule({
  imports: [CommonModule, RouterModule.forRoot([])],
  declarations: [V1ShellComponent]
})
class V1ShellTestModule { }

describe('V1ShellComponent', () => {
  let fixture: ComponentFixture<V1ShellComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [V1ShellTestModule]
    });
    fixture = TestBed.createComponent(V1ShellComponent);
    fixture.detectChanges();
  });

  it('renders the v1 shell with links to the current experience and P1 prototype', () => {
    expect(fixture.nativeElement.querySelector('#v1-title')?.textContent).toContain('Unified workspace');
    expect(fixture.nativeElement.querySelector('a[routerLink="/welcome"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('a[routerLink="/p1"]')).not.toBeNull();
  });
});
