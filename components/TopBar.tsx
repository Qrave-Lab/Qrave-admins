"use client";

type Props = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  rightSlot?: React.ReactNode;
};

export default function TopBar({ title, subtitle, rightSlot }: Props) {
  return (
    <header className="md:sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-brand-200">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-3 px-4 py-4 sm:py-5 sm:px-6 xl:px-8 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          {typeof title === "string" ? (
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-brand-900 text-balance">{title}</h1>
          ) : (
            title
          )}
          {typeof subtitle === "string" ? (
            <p className="mt-1 text-sm text-brand-500 max-w-prose">{subtitle}</p>
          ) : (
            subtitle
          )}
        </div>
        {rightSlot ? <div className="flex flex-wrap items-center gap-3">{rightSlot}</div> : null}
      </div>
    </header>
  );
}
