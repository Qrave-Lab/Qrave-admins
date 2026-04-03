"use client";

type Props = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  rightSlot?: React.ReactNode;
};

export default function TopBar({ title, subtitle, rightSlot }: Props) {
  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-brand-200 transition-all">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-8 py-6 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          {typeof title === "string" ? (
            <h1 className="truncate text-3xl font-bold tracking-tight text-brand-900">{title}</h1>
          ) : (
            title
          )}
          {typeof subtitle === "string" ? (
            <p className="mt-1.5 text-sm font-medium text-brand-500">{subtitle}</p>
          ) : (
            subtitle || <p className="mt-1.5 text-sm font-medium text-brand-500">Platform control and global business intelligence.</p>
          )}
        </div>
        {rightSlot ? <div className="flex items-center gap-4">{rightSlot}</div> : null}
      </div>
    </header>
  );
}
