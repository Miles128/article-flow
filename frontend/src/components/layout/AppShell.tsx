'use client';

import { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { useAppStore } from '@/lib/store';
import { clsx } from 'clsx';

interface AppShellProps {
 children: React.ReactNode;
 header?: React.ReactNode;
 headerBorderless?: boolean;
}

export function AppShell({ children, header, headerBorderless }: AppShellProps) {
 const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);

 useEffect(() => {
   document.documentElement.setAttribute(
     'data-sidebar-collapsed',
     sidebarCollapsed ? 'true' : 'false',
   );
 }, [sidebarCollapsed]);

 return (
 <div className="h-screen flex overflow-hidden">
 <Sidebar />
 <div
 className={clsx(
 'flex-1 flex flex-col overflow-hidden min-w-0 transition-[margin] duration-200',
 sidebarCollapsed ? 'md:ml-0' : 'md:ml-[var(--sidebar-width)]'
 )}
 >
 {header && (
 <div
 className={clsx(
 'flex-shrink-0 wen-chrome-bg',
 !headerBorderless && 'border-b',
 )}
 >
 {header}
 </div>
 )}
 <main className="flex-1 overflow-y-auto relative z-0 wen-main-canvas">{children}</main>
 </div>
 </div>
 );
}
