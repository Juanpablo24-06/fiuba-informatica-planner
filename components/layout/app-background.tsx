export default function AppBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-44 left-6 h-[400px] w-[400px] rounded-full bg-accent/14 blur-[120px] animate-float-slow" />
      <div className="absolute right-8 top-10 h-[460px] w-[460px] rounded-full bg-accent-2/12 blur-[140px] animate-float-slow" />
      <div className="absolute -bottom-32 left-1/2 h-[390px] w-[390px] -translate-x-1/2 rounded-full bg-accent-4/12 blur-[130px]" />
      <div className="absolute inset-0 subtle-grid opacity-22" />
    </div>
  );
}
