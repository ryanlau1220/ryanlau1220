/**
 * Reusable 1200x630 social preview template, rendered by Satori (flexbox subset, inline styles).
 * Every entry card and the diary's home card come from this one layout.
 */

export const OG_SIZE = { width: 1200, height: 630 } as const;

export interface DiaryCardProps {
  /** Small line above the title, such as "Chapter 2026". */
  kicker: string;
  title: string;
  /** Event name or a short description. */
  subtitle?: string | null;
  /** Handwritten line, such as the date. */
  note?: string | null;
  /** Data URL of the entry's first photo. Without one, a wax seal is drawn instead. */
  photoDataUrl?: string | null;
}

const INK = "#3b2414";
const PAPER = "#f3e6c8";
const GOLD = "#d9a441";

export function DiaryCard({ kicker, title, subtitle, note, photoDataUrl }: DiaryCardProps) {
  const titleSize = title.length > 48 ? 54 : title.length > 28 ? 64 : 76;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "radial-gradient(circle at 30% 20%, #4a2a17 0%, #1d100a 55%, #0d0705 100%)",
        padding: 36,
        fontFamily: "IM Fell English",
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          borderRadius: 18,
          background: `linear-gradient(135deg, ${PAPER} 0%, #e8d3a6 100%)`,
          border: `3px solid ${GOLD}`,
          boxShadow: "0 30px 60px rgba(0,0,0,0.5)",
          padding: "48px 56px",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", flex: 1, paddingRight: 32 }}>
          <div
            style={{
              display: "flex",
              fontSize: 26,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: "#8a5a2b",
            }}
          >
            {kicker}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 22,
              fontSize: titleSize,
              lineHeight: 1.05,
              color: INK,
            }}
          >
            {title}
          </div>
          {subtitle ? (
            <div style={{ display: "flex", marginTop: 22, fontSize: 30, color: "#6b4426" }}>
              {subtitle}
            </div>
          ) : null}
          <div style={{ display: "flex", flex: 1 }} />
          {note ? (
            <div style={{ display: "flex", fontFamily: "Caveat", fontSize: 44, color: "#7a3b1f" }}>
              {note}
            </div>
          ) : null}
          <div
            style={{
              display: "flex",
              marginTop: 10,
              fontSize: 24,
              color: "#8a5a2b",
              letterSpacing: 2,
            }}
          >
            Ryan's Diary · diary.ryanlau1220.dev
          </div>
        </div>

        {photoDataUrl ? (
          <div
            style={{
              display: "flex",
              width: 400,
              height: 470,
              marginTop: 8,
              background: "#fffdf7",
              padding: "16px 16px 64px",
              transform: "rotate(3deg)",
              boxShadow: "0 18px 40px rgba(40,20,5,0.45)",
            }}
          >
            <img
              src={photoDataUrl}
              alt=""
              width={368}
              height={390}
              style={{ width: 368, height: 390, objectFit: "cover" }}
            />
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              alignSelf: "center",
              alignItems: "center",
              justifyContent: "center",
              width: 260,
              height: 260,
              borderRadius: 130,
              background: "radial-gradient(circle at 35% 30%, #c0392b 0%, #7b1d14 70%)",
              boxShadow: "0 14px 30px rgba(60,10,5,0.5)",
              color: "#f6d6a8",
              fontFamily: "Caveat",
              fontSize: 120,
            }}
          >
            R
          </div>
        )}
      </div>
    </div>
  );
}
