import "../styles/MoleculeHero.css";

function MoleculeHero() {
  const beads = [
    { cx: 300, cy: 200, r: 70 },
    { cx: 430, cy: 140, r: 44 },
    { cx: 200, cy: 120, r: 36 },
    { cx: 170, cy: 290, r: 52 },
    { cx: 420, cy: 300, r: 38 },
    { cx: 320, cy: 360, r: 28 },
  ];
  const bonds = [
    [0, 1],
    [0, 2],
    [0, 3],
    [0, 4],
    [3, 5],
  ];

  return (
    <svg className="molecule-hero" viewBox="0 0 600 440" aria-hidden="true">
      <defs>
        <radialGradient id="bead" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#d6d6d6" />
          <stop offset="100%" stopColor="#8a8a8a" />
        </radialGradient>
      </defs>
      {bonds.map(([a, b], i) => (
        <line
          key={i}
          x1={beads[a].cx}
          y1={beads[a].cy}
          x2={beads[b].cx}
          y2={beads[b].cy}
          stroke="#bdbdbd"
          strokeWidth="10"
          strokeLinecap="round"
        />
      ))}
      {beads.map((b, i) => (
        <circle key={i} cx={b.cx} cy={b.cy} r={b.r} fill="url(#bead)" />
      ))}
    </svg>
  );
}

export default MoleculeHero;
