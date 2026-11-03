import type { ReactNode } from "react";

export interface MenuItem {
  icon?: ReactNode;
  label: string;
  hasDropdown?: boolean;
  isActive?: boolean;
  children?: MenuItem[];
}

export interface MenuSection {
  title: string;
  items: MenuItem[];
}

export interface SidebarContent {
  title: string;
  sections: MenuSection[];
}
