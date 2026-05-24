import Link from 'next/link';
import { clsx } from 'clsx';

type BrandLogoProps = {
 href?: string;
 size?: 'sm' | 'md' | 'lg';
 className?: string;
};

const sizeClass = {
 sm: 'text-xl',
 md: 'text-2xl',
 lg: 'text-3xl',
};

export function BrandLogo({ href = '/', size = 'md', className }: BrandLogoProps) {
 const mark = (
 <span
 className={clsx(
 'font-kaiti text-ink-900 tracking-[0.12em] leading-none select-none',
 sizeClass[size],
 className
 )}
      aria-label="写"
 >
      写
 </span>
 );

 if (href) {
 return (
 <Link href={href} className="inline-block hover:opacity-80 transition-opacity">
 {mark}
 </Link>
 );
 }

 return mark;
}
