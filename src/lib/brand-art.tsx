import { ImageResponse } from "next/og";
import { ElaraMark } from "@/components/elara-logo";

const colors = {
  ink: "#17201d",
  green: "#1e5141",
  greenDark: "#153c31",
  greenPale: "#e8f0ec",
  paper: "#fbfcfa",
  muted: "#68736e",
};

export function brandIcon(width: number, height: number) {
  const inset = Math.round(width * 0.07);
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: colors.paper }}>
      <div style={{ width: width - inset * 2, height: height - inset * 2, display: "flex", alignItems: "center", justifyContent: "center", color: "white", background: colors.green, borderRadius: Math.round(width * 0.24) }}>
        <ElaraMark style={{ width: width * 0.72, height: height * 0.72 }} />
      </div>
    </div>,
    { width, height },
  );
}

export function socialImage(width: number, height: number) {
  return new ImageResponse(
    <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", overflow: "hidden", color: colors.ink, background: colors.paper, fontFamily: "Arial, sans-serif" }}>
      <div style={{ position: "absolute", top: -210, right: -100, width: 570, height: 570, display: "flex", border: `1px solid ${colors.greenPale}`, borderRadius: "50%" }} />
      <div style={{ position: "absolute", right: 105, bottom: -235, width: 420, height: 420, display: "flex", background: colors.greenPale, borderRadius: "50%", opacity: 0.72 }} />
      <div style={{ width: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "70px 78px" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ width: 70, height: 70, display: "flex", alignItems: "center", justifyContent: "center", color: "white", background: colors.green, borderRadius: 20 }}><ElaraMark style={{ width: 62, height: 62 }} /></div>
          <div style={{ marginLeft: 23, color: colors.ink, fontSize: 29, fontWeight: 700, letterSpacing: 7 }}>ELARA</div>
        </div>
        <div style={{ width: 900, display: "flex", flexDirection: "column" }}>
          <div style={{ color: colors.green, fontSize: 19, fontWeight: 700, letterSpacing: 4.5, textTransform: "uppercase" }}>Executive operations workspace</div>
          <div style={{ marginTop: 21, display: "flex", fontFamily: "Georgia, serif", fontSize: 76, lineHeight: 1.03, letterSpacing: -2.5, whiteSpace: "pre-wrap" }}>{"Executive operations,\nintelligently organized."}</div>
          <div style={{ width: 760, marginTop: 25, color: colors.muted, fontSize: 25, lineHeight: 1.42 }}>Prepare meetings, manage communication, coordinate travel, and keep every commitment moving.</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", color: colors.greenDark, fontSize: 19, fontWeight: 700 }}>
          <div style={{ width: 42, height: 3, marginRight: 14, display: "flex", background: colors.green }} />
          Your executive context, in one place
        </div>
      </div>
    </div>,
    { width, height },
  );
}
