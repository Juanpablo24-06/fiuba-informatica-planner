/** The existing map loader's artwork, displayed as a static illustration at entry. */
export default function MapRouteIllustration({ className = '' }: { className?: string }) {
  return <svg viewBox="0 0 800 300" fill="none" aria-hidden="true" className={className}>
    <path d="M 60 240 C 120 240, 140 80, 200 80 S 280 200, 360 160 S 440 40, 520 80 S 600 220, 680 180 S 740 100, 760 60" stroke="rgb(var(--color-accent) / .65)" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M 360 160 C 380 200, 420 260, 500 240 S 580 200, 620 260" stroke="rgb(var(--color-accent-3) / .6)" strokeWidth="2" strokeLinecap="round"/>
    {[[60,240],[200,80],[360,160],[520,80],[680,180],[760,60]].map(([x,y],index) => <g key={index}>
      <circle cx={x} cy={y} r="12" stroke={`rgb(var(--color-${index === 3 ? 'accent-3' : index % 3 === 1 ? 'accent-2' : 'accent'}) / .45)`} strokeWidth="1.5" fill="rgb(var(--color-canvas))"/>
      <circle cx={x} cy={y} r="4" fill={`rgb(var(--color-${index === 3 ? 'accent-3' : index % 3 === 1 ? 'accent-2' : 'accent'}) / .8)`}/>
    </g>)}
  </svg>;
}
