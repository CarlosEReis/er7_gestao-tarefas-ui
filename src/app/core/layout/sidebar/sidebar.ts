import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MenuItem } from 'primeng/api';

interface MenuSection {
  title: string;
  items: MenuItem[];
}

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  isExpanded = false;

  menuSections: MenuSection[] = [
    {
      title: 'DASHBOARDS',
      items: [
        { label: 'E-Commerce', icon: 'pi pi-home' },
        { label: 'Banking', icon: 'pi pi-image' },
      ],
    },
    {
      title: 'APPS',
      items: [
        { label: 'Blog', icon: 'pi pi-comment', badge: 'v' },
        { label: 'Chat', icon: 'pi pi-comments' },
        { label: 'Files', icon: 'pi pi-folder' },
        { label: 'Kanban', icon: 'pi pi-bars' },
        { label: 'Mail', icon: 'pi pi-envelope', badge: 'v' },
        { label: 'Task List', icon: 'pi pi-check-square' },
      ],
    },
    {
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
    },
  ];

  onMouseEnter(): void {
    this.isExpanded = true;
  }

  onMouseLeave(): void {
    this.isExpanded = false;
  }
}
