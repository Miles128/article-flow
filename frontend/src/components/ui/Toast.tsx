'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
 id: string;
 type: ToastType;
 message: string;
}

// 全局 Toast 状态
let toastListeners: Array<(toast: Toast) => void> = [];

export function showToast(type: ToastType, message: string, duration = 3000) {
 const toast: Toast = {
 id: Math.random().toString(36).slice(2),
 type,
 message,
 };
 toastListeners.forEach(listener => listener(toast));

 if (duration > 0) {
 setTimeout(() => {
 dismissToast(toast.id);
 }, duration);
 }

 return toast.id;
}

export function dismissToast(id: string) {
 const event = { id, type: 'dismiss' as const };
 toastListeners.forEach(listener => listener(event as any));
}

// Toast 容器组件
export function ToastContainer() {
 const [toasts, setToasts] = useState<Toast[]>([]);

 useEffect(() => {
 const listener = (toast: Toast) => {
 if ((toast as any).type === 'dismiss') {
 setToasts(prev => prev.filter(t => t.id !== (toast as any).id));
 } else {
 setToasts(prev => [...prev, toast]);
 }
 };
 toastListeners.push(listener);
 return () => {
 toastListeners = toastListeners.filter(l => l !== listener);
 };
 }, []);

 const getIcon = (type: ToastType) => {
 switch (type) {
 case 'success': return '✓';
 case 'error': return '✕';
 case 'warning': return '⚠';
 case 'info': return 'ℹ';
 }
 };

	const getColors = (type: ToastType) => {
		switch (type) {
			case 'success':
				return 'bg-surface-100 border-surface-300 text-ink-800';
			case 'error':
				return 'bg-red-50/50 border-red-200 text-red-800';
			case 'warning':
				return 'bg-primary-50/50 border-primary-300 text-primary-800';
			case 'info':
				return 'bg-surface-100 border-surface-300 text-ink-700';
		}
	};

 if (toasts.length === 0) return null;

 return (
 <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
 {toasts.map(toast => (
 <div
 key={toast.id}
			className={`flex items-center gap-2 px-4 py-3 border animate-slide-in font-kaiti text-sm ${getColors(toast.type)}`}
 onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
 >
 <span className="text-lg">{getIcon(toast.type)}</span>
 <span className="text-sm flex-1">{toast.message}</span>
 </div>
 ))}
 </div>
 );
}
