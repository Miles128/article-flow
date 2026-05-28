'use client';

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

 return (
 <div className="h-screen flex overflow-hidden">
 <Sidebar />
 <div
 className={clsx(
 'flex-1 flex flex-col overflow-hidden min-w-0 transition-[margin] duration-200',
 sidebarCollapsed ? 'md:ml-0' : 'md:ml-40'
 )}
 >
 {header && (
 <div
 className={clsx(
 'flex-shrink-0 bg-surface-50/75 backdrop-blur-[3px]',
 !headerBorderless && 'border-b border-surface-300',
 )}
 >
 {header}
 </div>
 )}
 <main className="flex-1 overflow-y-auto relative z-0 bg-transparent">{children}</main>
 </div>
 </div>
 );
}
