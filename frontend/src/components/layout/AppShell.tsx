'use client';

import { Sidebar } from './Sidebar';
import { useAppStore } from '@/lib/store';
import { clsx } from 'clsx';

interface AppShellProps {
 children: React.ReactNode;
 header?: React.ReactNode;
}

export function AppShell({ children, header }: AppShellProps) {
 const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);

 return (
 <div className="h-screen bg-surface-100 flex overflow-hidden">
 <Sidebar />
 <div
 className={clsx(
 'flex-1 flex flex-col overflow-hidden min-w-0 transition-[margin] duration-200',
 sidebarCollapsed ? 'md:ml-0' : 'md:ml-40'
 )}
 >
 {header && (
 <div className="flex-shrink-0 border-b border-surface-300 bg-surface-100">{header}</div>
 )}
 <main className="flex-1 overflow-y-auto relative z-0 bg-surface-100">{children}</main>
 </div>
 </div>
 );
}
