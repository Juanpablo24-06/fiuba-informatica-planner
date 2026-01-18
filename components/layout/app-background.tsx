export default function AppBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-52 left-8 h-[420px] w-[420px] rounded-full bg-accent/12 blur-[150px] animate-float-slow" />
      <div className="absolute right-6 top-8 h-[460px] w-[460px] rounded-full bg-accent-2/12 blur-[160px] animate-float-slow" />
      <div className="absolute -bottom-44 left-1/2 h-[380px] w-[380px] -translate-x-1/2 rounded-full bg-accent-4/10 blur-[150px]" />
      <div className="absolute inset-0 subtle-grid opacity-35" />
    </div>
  );
}
