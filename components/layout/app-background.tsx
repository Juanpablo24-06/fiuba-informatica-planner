export default function AppBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-40 left-12 h-80 w-80 rounded-full bg-accent/15 blur-[120px] animate-float-slow" />
      <div className="absolute right-10 top-16 h-96 w-96 rounded-full bg-accent-2/10 blur-[140px] animate-float-slow" />
      <div className="absolute inset-0 subtle-grid opacity-40" />
    </div>
  );
}
