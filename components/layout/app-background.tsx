import type { CSSProperties } from "react";

export default function AppBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* Top-left warm orb — slightly smaller, higher and more to the right so the title sits inside it */}
      <div
        className="ambient-orb ambient-orb--accent -left-24 -top-8 z-10 h-[500px] w-[500px]"
        style={
          {
            "--orb-alpha-light": "0.18",
            "--orb-alpha-dark": "0.12",
            "--orb-float-x": "19px",
            "--orb-float-y": "-13px",
            "--orb-duration": "17s",
            "--orb-delay": "-4s"
          } as CSSProperties
        }
      />

      {/* Top-right cool accent — slate/blue */}
      <div
        className="ambient-orb ambient-orb--accent-4 -right-16 -top-10 h-[340px] w-[340px]"
        style={
          {
            "--orb-alpha-light": "0.16",
            "--orb-alpha-dark": "0.12",
            "--orb-float-x": "-16px",
            "--orb-float-y": "11px",
            "--orb-duration": "15.5s",
            "--orb-delay": "-9s"
          } as CSSProperties
        }
      />

      {/* Center-right subtle gold */}
      <div
        className="ambient-orb ambient-orb--accent-3 right-[4%] top-[40%] h-[260px] w-[260px]"
        style={
          {
            "--orb-alpha-light": "0.14",
            "--orb-alpha-dark": "0.1",
            "--orb-float-x": "13px",
            "--orb-float-y": "16px",
            "--orb-duration": "18.5s",
            "--orb-delay": "-14s"
          } as CSSProperties
        }
      />

      {/* Bottom-left blue orb — slightly higher so it frames "Cursada actual" and sits over the orange orb */}
      <div
        className="ambient-orb ambient-orb--accent-2 -left-12 top-[20.5rem] z-20 h-[340px] w-[340px]"
        style={
          {
            "--orb-alpha-light": "0.18",
            "--orb-alpha-dark": "0.14",
            "--orb-float-x": "16px",
            "--orb-float-y": "-11px",
            "--orb-duration": "14.5s",
            "--orb-delay": "-6s"
          } as CSSProperties
        }
      />

      {/* Bottom-center elective warm */}
      <div
        className="ambient-orb ambient-orb--elective bottom-[-7rem] left-1/2 h-[280px] w-[280px] -translate-x-1/2"
        style={
          {
            "--orb-alpha-light": "0.14",
            "--orb-alpha-dark": "0.1",
            "--orb-float-x": "-13px",
            "--orb-float-y": "-16px",
            "--orb-duration": "20s",
            "--orb-delay": "-11s"
          } as CSSProperties
        }
      />

      {/* Bottom-right coral echo */}
      <div
        className="ambient-orb ambient-orb--accent bottom-[-3rem] right-[4%] h-[220px] w-[220px]"
        style={
          {
            "--orb-alpha-light": "0.12",
            "--orb-alpha-dark": "0.08",
            "--orb-float-x": "-11px",
            "--orb-float-y": "13px",
            "--orb-duration": "16s",
            "--orb-delay": "-16s"
          } as CSSProperties
        }
      />


    </div>
  );
}
