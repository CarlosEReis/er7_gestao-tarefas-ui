import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MenuItem } from 'primeng/api';

interface MenuSection {
  title: string;
  items: MenuItem[];
}

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, RouterLink],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  isExpanded = false;

  menuSections: MenuSection[] = [
    {
      title: 'DASHBOARDS',
      items: [
        { label: 'Projetos', icon: 'pi pi-home' },
        { label: 'Tickets', icon: 'pi pi-image' },
      ],
    },
    {
      title: 'Aplicação',
      items: [
        { label: 'Projetos', icon: 'pi pi-address-book', routerLink: ['/projetos'] },
        { label: 'Tickets', icon: 'pi pi-list-check', routerLink: ['/tickets'] },
        { label: 'Releases', icon: 'pi pi-box' },
        { label: 'Agenda', icon: 'pi pi-calendar', routerLink: ['/agenda'] },
        { label: 'Usuários', icon: 'pi pi-users', routerLink: ['/usuarios'] },
        /*{ label: 'Kanban', icon: 'pi pi-bars' },
        { label: 'Mail', icon: 'pi pi-envelope', badge: 'v' },
        { label: 'Task List', icon: 'pi pi-check-square' },*/
      ],
    },
    /*{
      title: 'UI KIT',
      items: [
        { label: 'Form Layout', icon: 'pi pi-image' },
        { label: 'Input', icon: 'pi pi-check-square' },
        { label: 'Button', icon: 'pi pi-table' },
        { label: 'Table', icon: 'pi pi-table' },
        { label: 'List', icon: 'pi pi-list' },
        { label: 'Tree', icon: 'pi pi-share-alt' },
        { label: 'Panel', icon: 'pi pi-check-square' },
        { label: 'Overlay', icon: 'pi pi-window-maximize' },
        { label: 'Media', icon: 'pi pi-image' },
        { label: 'Menu', icon: 'pi pi-bars' },
      ],
    },*/
  ];

  onMouseEnter(): void {
    this.isExpanded = true;
  }

  onMouseLeave(): void {
    this.isExpanded = false;
  }
}
