const GLYPHS = "01<>/{}[]+-=*#";
const COLUMNS = Array.from({ length: 48 }, (_, column) =>
  Array.from({ length: 100 }, (_, row) => {
    const seed = (column * 37 + row * 23 + column * row * 7) % GLYPHS.length;
    return `${GLYPHS[seed]} ${GLYPHS[(seed + row + 3) % GLYPHS.length]}`;
  }).join("\n"),
);

export function LandingReveal() {
  return (
    <div className="landing-reveal" aria-hidden="true">
      <div className="landing-reveal-grid">
        {COLUMNS.map((column, index) => (
          <span key={index} style={{ animationDelay: `${(index % 9) * 40}ms` }}>
            {column}
          </span>
        ))}
      </div>
    </div>
  );
}
