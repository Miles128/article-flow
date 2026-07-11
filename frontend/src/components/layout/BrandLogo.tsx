import Link from 'next/link';
import { clsx } from 'clsx';

type BrandLogoProps = {
  href?: string;
  size?: 'sm' | 'md' | 'lg';
  seal?: boolean;
  className?: string;
};

const sizeClass = {
  sm: 'text-xl',
  md: 'text-2xl',
  lg: 'text-3xl',
};

export function BrandLogo({
  href = '/',
  size = 'md',
  seal = true,
  className,
}: BrandLogoProps) {
  const mark = seal ? (
    <span className="wen-brand-seal select-none" aria-label="寫">
      寫
    </span>
  ) : (
    <span
      className={clsx(
        'font-seal text-ink-900 tracking-[0.12em] leading-none select-none',
        sizeClass[size],
        className,
      )}
      aria-label="寫"
    >
      寫
    </span>
  );

  const block = seal ? (
    <div className={clsx('flex items-center gap-2.5', className)}>
      {mark}
      <div>
        <div className="font-kaiti text-lg tracking-[0.2em] text-ink-900 leading-none">
          文流
        </div>
        <div className="text-[10px] text-ink-300 tracking-widest leading-none mt-0.5">
          Article Flow
        </div>
      </div>
    </div>
  ) : (
    mark
  );

  if (href) {
    return (
      <Link href={href} className="inline-block hover:opacity-80 transition-opacity">
        {block}
      </Link>
    );
  }

  return block;
}
