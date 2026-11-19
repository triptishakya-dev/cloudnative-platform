interface HeroStatProps {
  value: string;
  label: string;
}

export default function HeroStat({ value, label }: HeroStatProps) {
  return (
    <div className="flex flex-col items-center gap-1 sm:items-start">
      <span className="text-2xl font-bold text-zinc-900 dark:text-white">{value}</span>
      <span className="text-sm text-zinc-500 dark:text-zinc-400">{label}</span>
    </div>
  );
}
