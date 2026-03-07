export default function AppBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-32 left-0 h-[360px] w-[360px] rounded-full bg-accent/12 blur-[120px]" />
      <div className="absolute right-0 top-8 h-[420px] w-[420px] rounded-full bg-accent-2/10 blur-[150px]" />
      <div className="absolute -bottom-24 left-1/2 h-[340px] w-[340px] -translate-x-1/2 rounded-full bg-accent-4/10 blur-[130px]" />
    </div>
  );
}
