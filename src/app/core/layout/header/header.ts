import { Component, OnInit } from '@angular/core';
import { MenuItem } from 'primeng/api';

import { AvatarModule } from 'primeng/avatar';
import { InputIcon } from 'primeng/inputicon';
import { IconField } from 'primeng/iconfield';
import { InputTextModule } from 'primeng/inputtext';
import { Menubar } from 'primeng/menubar';

import { OverlayBadgeModule } from 'primeng/overlaybadge';

@Component({
  selector: 'app-header',
  imports: [Menubar, OverlayBadgeModule, AvatarModule, InputTextModule, IconField, InputIcon],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header implements OnInit {
  protected moonAndSun: 'moon' | 'sun' = 'moon';

  items: MenuItem[] = [];

  ngOnInit() {
    this.items = [
      {
        label: 'Home',
        icon: 'pi pi-home',
      },
    ];
  }

  toggleDarkMode() {
    this.moonAndSun = this.moonAndSun === 'sun' ? 'moon' : 'sun';
    const element = document.querySelector('html');
    element!.classList.toggle('my-app-dark');
  }
}
