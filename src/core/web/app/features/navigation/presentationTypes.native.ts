import type {RoleNavItem} from './roleNavigation';
export type NavigationGroupId = 'my-work' | 'workspaces' | 'inbox' | 'accounting' | 'admin-center' | 'account';
export interface ShellNavigationItem extends RoleNavItem {
 group:NavigationGroupId;
 pages:{label:string}[];
 hasAlert?:boolean;
}
