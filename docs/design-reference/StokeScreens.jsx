/**
 * Stoke — 6 New Screens
 * Faithful to uploaded design: coral/white/black primary, purple + green accents only.
 * Nunito 900 headlines. Full-bleed hero cards. Organic tone-on-tone shapes.
 *
 * Add to index.html:
 * <link href="https://fonts.googleapis.com/css2?family=Nunito:ital,wght@0,600;0,700;0,800;0,900;1,700&display=swap" rel="stylesheet">
 */

import { useState } from "react";

const C = {
  coral:    "#D4522A",
  coralLt:  "#F5E8E2",
  coralDk:  "#B03F1E",
  black:    "#1E1E2E",
  white:    "#FFFFFF",
  warm:     "#F5F2EE",
  mid:      "#7A7A8A",
  hint:     "#B8B8C4",
  border:   "#E8E4DE",
  purple:   "#3D2870",
  green:    "#7BAE7F",
};

const f = "'Nunito', sans-serif";

// ── Organic shapes — wide ellipses + rotated rects, tone-on-tone
const Shapes = ({ light = false }) => (
  <svg width="100%" height="100%" viewBox="0 0 320 520" fill="none"
    style={{ position:"absolute", inset:0, pointerEvents:"none",
      opacity: light ? 0.08 : 0.1 }}>
    <ellipse cx="280" cy="60"  rx="110" ry="110" fill="#fff"/>
    <rect x="-60" y="100" width="480" height="90" rx="45" fill="#fff" transform="rotate(-18 -60 100)"/>
    <rect x="-60" y="200" width="480" height="65" rx="32" fill="#fff" transform="rotate(-18 -60 200)"/>
    <ellipse cx="40"  cy="480" rx="100" ry="100" fill="#fff"/>
  </svg>
);

// ── Full-width pill button
const Btn = ({ label, bg = C.coral, color = "#fff", onClick }) => (
  <button onClick={onClick} style={{
    display:"block", width:"100%", background:bg, color,
    border:"none", borderRadius:50, padding:"14px 0",
    fontFamily:f, fontSize:11, fontWeight:900,
    letterSpacing:".14em", textTransform:"uppercase",
    textAlign:"center", cursor:"pointer",
  }}>{label}</button>
);

// ── Eyebrow
const Cap = ({ children, color = C.hint, style = {} }) => (
  <p style={{ fontFamily:f, fontSize:8, fontWeight:800,
    letterSpacing:".12em", textTransform:"uppercase", color, margin:0, ...style }}>
    {children}
  </p>
);

// ── Headline
const H = ({ children, size = 20, color = C.black, style = {} }) => (
  <h1 style={{ fontFamily:f, fontSize:size, fontWeight:900, color,
    lineHeight:1.15, letterSpacing:"-.3px", margin:0, ...style }}>
    {children}
  </h1>
);

// ── Body
const Body = ({ children, color = C.mid, style = {} }) => (
  <p style={{ fontFamily:f, fontSize:11, fontWeight:600,
    color, lineHeight:1.5, margin:0, ...style }}>
    {children}
  </p>
);

// ── Nav bar — exact match to home screen
const Nav = ({ active }) => {
  const tabs = [
    { key:"home",     label:"Home",
      path:<><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1z"/><path d="M9 21V12h6v9"/></> },
    { key:"today",    label:"Today",
      path:<path d="M12 22c3-5 7-8 7-13A7 7 0 005 9c0 5 4 8 7 13z"/> },
    { key:"memories", label:"Memories",
      path:<><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></> },
    { key:"insights", label:"Insights",
      path:<path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l7.78-7.78a5.5 5.5 0 000-7.78z"/> },
    { key:"settings", label:"Settings",
      path:<><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></> },
  ];
  return (
    <div style={{ display:"flex", justifyContent:"space-around", alignItems:"flex-end",
      padding:"7px 4px 18px", background:C.white, borderTop:`1px solid ${C.border}`,
      flexShrink:0 }}>
      {tabs.map(({ key, label, path }) => {
        const on = active === key;
        return (
          <div key={key} style={{ display:"flex", flexDirection:"column", alignItems:"center",
            gap:3, fontFamily:f, fontSize:8, fontWeight:800,
            color: on ? C.coral : C.hint, minWidth:38 }}>
            <div style={{ width:38, height:28, borderRadius:9,
              background: on ? C.coralLt : "transparent",
              display:"flex", alignItems:"center", justifyContent:"center" }}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none"
                stroke={on ? C.coral : C.hint} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                {path}
              </svg>
            </div>
            {label}
          </div>
        );
      })}
    </div>
  );
};

// ── Icon circle (audio-player style top-bar buttons)
const IC = ({ dark, children }) => (
  <div style={{ width:36, height:36, borderRadius:"50%", flexShrink:0,
    background: dark ? "rgba(10,6,4,.42)" : C.white,
    display:"flex", alignItems:"center", justifyContent:"center" }}>
    {children}
  </div>
);

// ══════════════════════════════════════════════════════════════════════════════
// SCREEN A · TODAY'S SPARK (Engine 2 · Action)
// ══════════════════════════════════════════════════════════════════════════════
export function TodaySpark() {
  const words = ["Heavy","Bright","Tired","Cozy","Full","Soft","Wired","Still"];
  const [sel, setSel] = useState("Heavy");

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", background:C.white }}>

      {/* Hero — full-width coral card */}
      <div style={{ background:C.coral, padding:"28px 22px 32px",
        position:"relative", overflow:"hidden", flexShrink:0 }}>
        <Shapes />
        <Cap color="rgba(255,255,255,.55)" style={{ marginBottom:10 }}>Engine 2 · Action</Cap>
        <H size={28} color="#fff" style={{ marginBottom:10 }}>Today's<br/>Spark.</H>
        <Body color="rgba(255,255,255,.72)">
          Send one word for how today feels.<br/>Your partner guesses why.
        </Body>
      </div>

      {/* Word grid */}
      <div style={{ padding:"20px 20px 0", flex:1, display:"flex", flexDirection:"column", gap:14 }}>
        <Cap>Pick your word</Cap>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
          {words.map(w => (
            <button key={w} onClick={() => setSel(w)} style={{
              borderRadius:50, padding:"9px 0", border:"none", cursor:"pointer",
              fontFamily:f, fontSize:10, fontWeight:800, textAlign:"center",
              background: sel === w ? C.coral : C.warm,
              color:       sel === w ? "#fff"    : C.mid,
            }}>{w}</button>
          ))}
        </div>
        <div style={{ background:C.warm, borderRadius:12, border:`1.5px solid ${C.border}`,
          padding:"11px 14px", fontFamily:f, fontSize:10, fontWeight:600, color:C.hint }}>
          Or type your own word…
        </div>
        <Btn label="Send to Jordan" />
        <Cap style={{ textAlign:"center", color:C.hint }}>They'll guess why — you reveal after</Cap>
      </div>

      <div style={{ height:8 }} />
      <Nav active="today" />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SCREEN B · PARTNER GUESS (Tennis match)
// ══════════════════════════════════════════════════════════════════════════════
export function PartnerGuess() {
  const opts = [
    { key:"work",      label:"Work has been a lot lately" },
    { key:"emotional", label:"Feeling emotional" },
    { key:"sleep",     label:"Didn't sleep well" },
    { key:"other",     label:"Something else" },
  ];
  const [sel, setSel] = useState("work");

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", background:C.white }}>
      <div style={{ padding:"20px 20px 0" }}>
        <Cap style={{ marginBottom:8 }}>Jordan received your word</Cap>
        <H size={20} style={{ marginBottom:6 }}>What do you<br/>think Alex meant?</H>
        <Body style={{ marginBottom:16 }}>One guess — they'll reveal after.</Body>
      </div>

      {/* Word reveal — dominant black card */}
      <div style={{ margin:"0 20px 16px", background:C.black, borderRadius:20,
        padding:"24px 22px", position:"relative", overflow:"hidden" }}>
        <Shapes light />
        <Cap color="rgba(255,255,255,.45)" style={{ marginBottom:10 }}>Alex sent this morning</Cap>
        <H size={52} color="#fff" style={{ letterSpacing:"-2px", lineHeight:1 }}>Heavy</H>
        <p style={{ fontFamily:f, fontSize:10, fontWeight:600,
          color:"rgba(255,255,255,.35)", marginTop:8 }}>8:14 am · pick a reason below</p>
      </div>

      {/* Guess options */}
      <div style={{ padding:"0 20px", display:"flex", flexDirection:"column", gap:8 }}>
        <Cap style={{ marginBottom:2 }}>Why do you think?</Cap>
        {opts.map(({ key, label }) => {
          const on = sel === key;
          return (
            <button key={key} onClick={() => setSel(key)} style={{
              display:"flex", alignItems:"center", gap:10,
              padding:"11px 14px", borderRadius:14, cursor:"pointer", border:"none",
              fontFamily:f, fontSize:11, fontWeight:700, textAlign:"left",
              border: `1.5px solid ${on ? C.coral : C.border}`,
              background: on ? C.coralLt : C.white,
              color: on ? C.coral : C.black,
            }}>
              <div style={{ width:15, height:15, borderRadius:"50%", flexShrink:0,
                border:`2px solid ${on ? C.coral : C.hint}`,
                display:"flex", alignItems:"center", justifyContent:"center" }}>
                {on && <div style={{ width:7, height:7, borderRadius:"50%", background:C.coral }} />}
              </div>
              {label}
            </button>
          );
        })}
        <div style={{ marginTop:8 }}><Btn label="Submit guess" /></div>
        <Cap style={{ textAlign:"center", color:C.hint }}>Alex reveals after you guess</Cap>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SCREEN C · MORNING CHECK-IN (Engine 1 · Learn)
// ══════════════════════════════════════════════════════════════════════════════
export function MorningCheckin() {
  const moods = [
    { key:"encourage", label:"I need encouragement" },
    { key:"space",     label:"I need space" },
    { key:"laughter",  label:"I need laughter" },
    { key:"stability", label:"I need stability" },
  ];
  const [sel, setSel] = useState("encourage");

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", background:C.white }}>
      <div style={{ padding:"20px 20px 14px" }}>
        <Cap style={{ marginBottom:8 }}>Engine 1 · Learn</Cap>
        <H size={20} style={{ marginBottom:6 }}>One question.<br/>Five seconds.</H>
        <Body>Jordan sees a forecast — not your answer.</Body>
      </div>

      {/* Question card — black */}
      <div style={{ margin:"0 20px 14px", background:C.black, borderRadius:20,
        padding:20, position:"relative", overflow:"hidden" }}>
        <Shapes light />
        <Cap color="rgba(255,255,255,.5)" style={{ marginBottom:12 }}>
          Which sounds most like you today?
        </Cap>
        <div style={{ display:"flex", flexDirection:"column", gap:8, position:"relative" }}>
          {moods.map(({ key, label }) => {
            const on = sel === key;
            return (
              <button key={key} onClick={() => setSel(key)} style={{
                display:"flex", alignItems:"center", gap:9,
                padding:"10px 13px", borderRadius:12, border:"none", cursor:"pointer",
                background: on ? "rgba(255,255,255,.18)" : "rgba(255,255,255,.06)",
              }}>
                <div style={{ width:9, height:9, borderRadius:"50%", flexShrink:0,
                  background: on ? "#fff" : "transparent",
                  border: `2px solid ${on ? "#fff" : "rgba(255,255,255,.3)"}` }} />
                <span style={{ fontFamily:f, fontSize:11, fontWeight:700,
                  color: on ? "#fff" : "rgba(255,255,255,.5)" }}>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Privacy card */}
      <div style={{ margin:"0 20px 14px", border:`1.5px solid ${C.border}`,
        borderRadius:16, padding:14 }}>
        <Cap style={{ marginBottom:6 }}>Jordan receives</Cap>
        <p style={{ fontFamily:f, fontSize:11, fontWeight:700, color:C.black,
          lineHeight:1.5, fontStyle:"italic", margin:0 }}>
          "Today might be a good day to remind Alex they're not alone."
        </p>
      </div>

      <div style={{ padding:"0 20px 16px" }}>
        <Btn label="Done" />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SCREEN D · SURPRISE MISSION (Full coral — exact audio player layout)
// ══════════════════════════════════════════════════════════════════════════════
export function SurpriseMission({ onClose }) {
  return (
    <div style={{ flex:1, background:C.coral, display:"flex",
      flexDirection:"column", position:"relative", overflow:"hidden" }}>
      <Shapes />

      {/* Top bar — white X, dark icon circles */}
      <div style={{ display:"flex", alignItems:"center",
        justifyContent:"space-between", padding:"14px 18px", position:"relative" }}>
        <IC><svg width="12" height="12" viewBox="0 0 14 14" fill="none"
          stroke={C.black} strokeWidth="2.2" strokeLinecap="round">
          <line x1="1" y1="1" x2="13" y2="13"/><line x1="13" y1="1" x2="1" y2="13"/>
        </svg></IC>
        <div style={{ display:"flex", gap:8 }}>
          <IC dark>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="#fff" strokeWidth="1.8" strokeLinecap="round">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l7.78-7.78a5.5 5.5 0 000-7.78z"/>
            </svg>
          </IC>
          <IC dark>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="#fff" strokeWidth="1.8" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </IC>
        </div>
      </div>

      {/* Main — centred, like Five Minute Connection */}
      <div style={{ flex:1, display:"flex", flexDirection:"column",
        justifyContent:"center", padding:"0 28px", position:"relative" }}>
        <Cap color="rgba(255,255,255,.55)" style={{ marginBottom:16 }}>Tonight's mission</Cap>
        <H size={26} color="#fff" style={{ lineHeight:1.35, marginBottom:18 }}>
          "Leave before they wake up.<br/><br/>Hide a note somewhere they'll find tomorrow."
        </H>
        <Body color="rgba(255,255,255,.5)" style={{ fontStyle:"italic" }}>
          Small acts. Long memories.
        </Body>
      </div>

      {/* CTA — white pill + ghost skip */}
      <div style={{ padding:"0 20px 36px", display:"flex",
        flexDirection:"column", gap:8, position:"relative" }}>
        <Btn label="I'm in" bg={C.white} color={C.coral} />
        <p style={{ fontFamily:f, fontSize:9, fontWeight:800,
          letterSpacing:".12em", textTransform:"uppercase",
          color:"rgba(255,255,255,.38)", textAlign:"center", margin:0, padding:"6px 0" }}>
          Skip for now
        </p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SCREEN E · EVENING REFLECTION (Engine 3 · Reflect)
// ══════════════════════════════════════════════════════════════════════════════
export function EveningReflection() {
  const [score, setScore]   = useState(4);
  const [helped, setHelped] = useState(new Set(["Humor", "Shared meal"]));
  const chips = ["Humor","Affection","Shared meal","Conversation","Quiet time","A text"];

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", background:C.white }}>
      <div style={{ padding:"20px 20px 14px" }}>
        <Cap style={{ marginBottom:8 }}>Engine 3 · Reflect</Cap>
        <H size={20}>How did today<br/>feel?</H>
      </div>

      {/* Score — black hero card */}
      <div style={{ margin:"0 20px 14px", background:C.black, borderRadius:20,
        padding:20, position:"relative", overflow:"hidden" }}>
        <Shapes light />
        <Cap color="rgba(255,255,255,.5)" style={{ marginBottom:12 }}>
          How connected did you feel today?
        </Cap>
        <div style={{ display:"flex", gap:10, alignItems:"center", position:"relative" }}>
          {[1,2,3,4,5].map(n => (
            <svg key={n} onClick={() => setScore(n)}
              width="26" height="26" viewBox="0 0 24 24" style={{ cursor:"pointer" }}
              fill={n <= score ? C.coral : "none"}
              stroke={n <= score ? C.coral : "rgba(255,255,255,.2)"} strokeWidth="1.5">
              <path d="M12 21C12 21 3 14.5 3 9A5 5 0 0112 5.7 5 5 0 0121 9c0 5.5-9 12-9 12z"/>
            </svg>
          ))}
        </div>
        <p style={{ fontFamily:f, fontSize:9, fontWeight:600, margin:"8px 0 0",
          color:"rgba(255,255,255,.3)", position:"relative" }}>{score} out of 5 · Tuesday</p>
      </div>

      {/* What helped */}
      <div style={{ padding:"0 20px 14px" }}>
        <Cap style={{ marginBottom:10 }}>What helped today?</Cap>
        <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
          {chips.map(c => {
            const on = helped.has(c);
            return (
              <button key={c} onClick={() => {
                const next = new Set(helped);
                on ? next.delete(c) : next.add(c);
                setHelped(next);
              }} style={{
                borderRadius:50, padding:"8px 14px", border:"none", cursor:"pointer",
                fontFamily:f, fontSize:9, fontWeight:800,
                background: on ? C.coral : C.warm,
                color:       on ? "#fff"    : C.mid,
              }}>{c}</button>
            );
          })}
        </div>
      </div>

      {/* Insight — purple accent */}
      <div style={{ margin:"0 20px", background:C.purple, borderRadius:16,
        padding:16, position:"relative", overflow:"hidden" }}>
        <svg width="100%" height="100%" viewBox="0 0 220 90" fill="none"
          style={{ position:"absolute", inset:0, opacity:.08, pointerEvents:"none" }}>
          <ellipse cx="185" cy="10" rx="70" ry="70" fill="#fff"/>
        </svg>
        <Cap color="rgba(255,255,255,.5)" style={{ marginBottom:6 }}>Stoke noticed</Cap>
        <p style={{ fontFamily:f, fontSize:11, fontWeight:700, color:"#fff",
          lineHeight:1.55, fontStyle:"italic", margin:0 }}>
          "Shared meals twice a week lift your connection score 34%."
        </p>
      </div>

      <div style={{ padding:"14px 20px 16px" }}>
        <Btn label="Done for tonight" />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SCREEN F · COACH INSIGHTS (Engine 4 · Coach)
// ══════════════════════════════════════════════════════════════════════════════
export function CoachInsights() {
  const bars = [
    { label:"Laughter",  pct:78, color:C.coral },
    { label:"Curiosity", pct:91, color:C.black },
    { label:"Play",      pct:52, color:C.purple },
  ];

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", background:C.white }}>
      <div style={{ padding:"20px 20px 14px" }}>
        <Cap style={{ marginBottom:8 }}>Engine 4 · Coach</Cap>
        <H size={20} style={{ marginBottom:4 }}>I've been<br/>watching.</H>
        <Body>Patterns take time. Here's what I see.</Body>
      </div>

      {/* Main insight — coral hero */}
      <div style={{ margin:"0 20px 12px", background:C.coral, borderRadius:20,
        padding:20, position:"relative", overflow:"hidden" }}>
        <Shapes />
        <Cap color="rgba(255,255,255,.55)" style={{ marginBottom:10 }}>Tonight</Cap>
        <H size={20} color="#fff" style={{ marginBottom:10, lineHeight:1.3 }}>
          Skip the deep talk.<br/>Order dessert.
        </H>
        <Body color="rgba(255,255,255,.65)">
          You've both been running on empty for 5 days. Tonight isn't the night.
        </Body>
      </div>

      {/* Stat — black card */}
      <div style={{ margin:"0 20px 12px", background:C.black, borderRadius:16,
        padding:16, position:"relative", overflow:"hidden" }}>
        <svg width="100%" height="100%" viewBox="0 0 220 90" fill="none"
          style={{ position:"absolute", inset:0, opacity:.05, pointerEvents:"none" }}>
          <ellipse cx="190" cy="0" rx="80" ry="80" fill="#fff"/>
        </svg>
        <Cap color="rgba(255,255,255,.45)" style={{ marginBottom:8 }}>Laughter lifts connection</Cap>
        <p style={{ fontFamily:f, fontSize:38, fontWeight:900, color:C.coral,
          lineHeight:1, margin:"0 0 4px", position:"relative" }}>+22%</p>
        <p style={{ fontFamily:f, fontSize:10, fontWeight:600,
          color:"rgba(255,255,255,.4)", margin:0, position:"relative" }}>
          the morning after you laugh together
        </p>
      </div>

      {/* Momentum bars */}
      <div style={{ padding:"0 20px 14px" }}>
        <Cap style={{ marginBottom:10 }}>This week's momentum</Cap>
        <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
          {bars.map(({ label, pct, color }) => (
            <div key={label} style={{ display:"flex", alignItems:"center", gap:10 }}>
              <p style={{ fontFamily:f, fontSize:9, fontWeight:800,
                color:C.mid, width:66, margin:0 }}>{label}</p>
              <div style={{ flex:1, height:6, background:C.warm, borderRadius:3, overflow:"hidden" }}>
                <div style={{ width:`${pct}%`, height:"100%", background:color, borderRadius:3 }} />
              </div>
              <p style={{ fontFamily:f, fontSize:9, fontWeight:800,
                color, width:28, textAlign:"right", margin:0 }}>{pct}%</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex:1 }} />
      <Nav active="insights" />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ROOT — Screen picker (for dev preview)
// ══════════════════════════════════════════════════════════════════════════════
const SCREENS = [
  { id:"spark",      label:"Today's Spark",  C: TodaySpark },
  { id:"guess",      label:"Partner Guess",  C: PartnerGuess },
  { id:"checkin",    label:"Check-in",       C: MorningCheckin },
  { id:"mission",    label:"Mission",        C: SurpriseMission },
  { id:"reflection", label:"Reflection",     C: EveningReflection },
  { id:"coach",      label:"Coach",          C: CoachInsights },
];

export default function StokeScreens() {
  const [active, setActive] = useState("spark");
  const Screen = SCREENS.find(s => s.id === active)?.C ?? TodaySpark;

  return (
    <div style={{ minHeight:"100vh", background:"#E8E5E0", fontFamily:f }}>
      <div style={{ display:"flex", flexWrap:"wrap", gap:6, padding:"16px 20px",
        borderBottom:`1px solid ${C.border}`, background:C.white, justifyContent:"center" }}>
        {SCREENS.map(({ id, label }) => (
          <button key={id} onClick={() => setActive(id)} style={{
            padding:"7px 14px", borderRadius:50, fontSize:10, cursor:"pointer",
            fontFamily:f, fontWeight:800, letterSpacing:".06em",
            background: active === id ? C.coral : C.warm,
            color:       active === id ? "#fff"    : C.mid,
            border: `1.5px solid ${active === id ? C.coral : C.border}`,
          }}>{label}</button>
        ))}
      </div>
      <div style={{ display:"flex", justifyContent:"center", padding:"40px 20px" }}>
        <div style={{ width:375, height:812, borderRadius:44, overflow:"hidden",
          border:"8px solid #111", background:C.white, display:"flex", flexDirection:"column",
          boxShadow:"0 24px 60px rgba(0,0,0,.2)" }}>
          <div style={{ height:44, background:C.white, display:"flex",
            alignItems:"flex-end", justifyContent:"center", paddingBottom:8 }}>
            <div style={{ width:80, height:9, borderRadius:5, background:"rgba(0,0,0,.08)" }} />
          </div>
          <Screen onClose={() => setActive("spark")} />
        </div>
      </div>
    </div>
  );
}
