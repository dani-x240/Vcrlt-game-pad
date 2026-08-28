import React, { useState, useEffect, useMemo } from "react";
import {
  ChevronLeft,
  Flame,
  Sparkles,
  Lock,
  Send,
  Crown,
  Star,
  Download,
  Share,
  X,
  Home,
  TrendingUp,
  MessageCircle,
  User,
} from "lucide-react";

// ---------- Design tokens ----------
// bg: #12241D (bark), card: #1B332A, cream: #F4EDDD
// leaf: #7FBF6B (mastery), gold: #E3B23C (xp/growth), ember: #C9622B (boss), locked: #4B5A52

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Manrope:wght@400;500;600;700;800&display=swap');`;

const tracks = {
  sciences: {
    name: "Sciences",
    emoji: "🔬",
    example: "Physics, Chemistry, Maths, Biology",
    blurb: "For learners drawn to how things work — leads toward medicine, engineering, tech.",
  },
  arts: {
    name: "Arts & Humanities",
    emoji: "📖",
    example: "History, Economics, Geography, Literature",
    blurb: "For learners drawn to people, society, and ideas — leads toward law, media, social sciences.",
  },
  technical: {
    name: "Technical & Vocational",
    emoji: "🛠️",
    example: "Technical Drawing, Agriculture, Nutrition",
    blurb: "For learners who like building and applying skills directly — leads toward trades, agribusiness.",
  },
  undecided: {
    name: "Not sure yet",
    emoji: "🌱",
    example: "Keep exploring all subjects",
    blurb: "Totally fine — most students decide later. BAOBAB won't lock you out of anything.",
  },
};

const leaderboardWeek = [
  { name: "Grace N.", pts: 1420 },
  { name: "Kato B.", pts: 1385 },
  { name: "Daniel (You)", pts: 1310, isYou: true },
  { name: "Immaculate A.", pts: 1275 },
  { name: "Peter O.", pts: 1210 },
  { name: "Sarah K.", pts: 1180 },
  { name: "Musa T.", pts: 1140 },
  { name: "Ritah M.", pts: 1095 },
  { name: "Brian W.", pts: 1050 },
  { name: "Faith L.", pts: 1010 },
  { name: "Joel S.", pts: 970 },
  { name: "Winnie P.", pts: 940 },
  { name: "Trevor K.", pts: 905 },
  { name: "Doreen N.", pts: 870 },
  { name: "Allan M.", pts: 840 },
  { name: "Patience A.", pts: 810 },
  { name: "Isaac B.", pts: 780 },
  { name: "Mercy T.", pts: 750 },
  { name: "Kevin R.", pts: 720 },
  { name: "Aisha N.", pts: 690 },
];

const initialCurriculumDocs = [
  { name: "NCDC Mathematics Syllabus — S1-S4.pdf", status: "verified" },
  { name: "NCDC Lower Secondary Curriculum Framework.pdf", status: "verified" },
  { name: "S3 Algebra — Term 2 scheme of work.docx", status: "pending review" },
];

const initialSubjects = {
  mathematics: {
    name: "Mathematics",
    emoji: "🌿",
    topics: {
      numbers: { name: "Numbers", mastery: 78, locked: false },
      algebra: {
        name: "Algebra",
        mastery: 60,
        locked: false,
        subtopics: {
          intro: { name: "Introduction to Algebra", mastery: 100, locked: false },
          variables: { name: "Variables", mastery: 85, locked: false },
          expressions: {
            name: "Expressions",
            mastery: 40,
            locked: false,
            lesson: {
              youllLearn: ["What expressions are", "Variables in expressions", "Simplifying expressions"],
              teach:
                "Think of an expression like a recipe — 3x + 5 just means 'take whatever x is, multiply it by 3, then add 5.' That's it. No equals sign, so there's nothing to solve — you're just simplifying, making the recipe shorter and neater.",
              practice: [
                {
                  q: "Simplify: 2x + 3x",
                  options: ["5x", "6x", "2x³", "5x²"],
                  answer: 0,
                },
                {
                  q: "Simplify: 4y + 2 + y",
                  options: ["5y + 2", "6y", "4y + 2y", "7y"],
                  answer: 0,
                },
                {
                  q: "Which is a 'like term' with 7a?",
                  options: ["7b", "3a", "7", "a²"],
                  answer: 1,
                },
              ],
              boss: {
                q: "Simplify fully: 3x + 4 + 2x − 1",
                options: ["5x + 3", "5x + 5", "6x + 3", "x + 3"],
                answer: 0,
                title: "EXPRESSIONS BOSS",
                reward: "Expression Master",
              },
            },
          },
          equations: { name: "Equations", mastery: 0, locked: true },
          inequalities: { name: "Inequalities", mastery: 0, locked: true },
        },
      },
      geometry: { name: "Geometry", mastery: 0, locked: true },
      statistics: { name: "Statistics", mastery: 0, locked: true },
      probability: { name: "Probability", mastery: 0, locked: true },
    },
  },
  science: { name: "Science", emoji: "🔬", topics: {} },
  english: { name: "English", emoji: "📚", topics: {} },
  social: { name: "Social Studies", emoji: "🌍", topics: {} },
};

const electivePool = {
  ict: { name: "ICT / Computer Studies", emoji: "💻", topics: {} },
  agriculture: { name: "Agriculture", emoji: "🌾", topics: {} },
  french: { name: "French", emoji: "🇫🇷", topics: {} },
  fineart: { name: "Fine Art", emoji: "🎨", topics: {} },
  literature: { name: "Literature in English", emoji: "🖋️", topics: {} },
  pe: { name: "Physical Education", emoji: "⚽", topics: {} },
};

function decayMastery(mastery, daysInactive) {
  if (!daysInactive) return mastery;
  // Leaves fall the longer you're away, but decay is capped at half of what
  // was earned — coming back always means a quick review, never starting over.
  const lost = Math.min(daysInactive * 3, mastery * 0.5);
  return Math.max(0, Math.round(mastery - lost));
}

function withDecay(subjects, daysInactive) {
  if (!daysInactive) return subjects;
  const copy = structuredClone(subjects);
  Object.values(copy).forEach((subj) => {
    Object.values(subj.topics || {}).forEach((t) => {
      if (!t.locked) t.mastery = decayMastery(t.mastery, daysInactive);
      if (t.subtopics) {
        Object.values(t.subtopics).forEach((st) => {
          if (!st.locked) st.mastery = decayMastery(st.mastery, daysInactive);
        });
      }
    });
  });
  return copy;
}

function BabsiFace({ mood = "neutral", size = 40 }) {
  const eyes = {
    happy: { l: "M10 17 Q13 14 16 17", r: "M24 17 Q27 14 30 17" },
    celebrate: { l: "M9 16 Q13 12 17 16", r: "M23 16 Q27 12 31 16" },
    concerned: { l: "M11 15 L15 18", r: "M29 15 L25 18" },
    sad: { l: "M10 18 Q13 15 16 18", r: "M24 18 Q27 15 30 18" },
    neutral: { l: null, r: null },
  }[mood];
  const mouth = {
    happy: "M13 25 Q20 32 27 25",
    celebrate: "M12 24 Q20 34 28 24 Q20 30 12 24",
    concerned: "M14 27 Q20 24 26 27",
    sad: "M14 28 Q20 23 26 28",
    neutral: "M14 26 L26 26",
  }[mood];
  return (
    <svg width={size} height={size} viewBox="0 0 40 40">
      <circle cx="20" cy="20" r="19" fill="#7FBF6B" />
      {eyes.l ? (
        <>
          <path d={eyes.l} stroke="#12241D" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <path d={eyes.r} stroke="#12241D" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="13" cy="17" r="2.4" fill="#12241D" />
          <circle cx="27" cy="17" r="2.4" fill="#12241D" />
        </>
      )}
      <path d={mouth} stroke="#12241D" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function BottomNav({ active, onNav }) {
  const items = [
    { key: "dashboard", icon: Home, label: "Home" },
    { key: "progress", icon: TrendingUp, label: "Progress" },
    { key: "babsiHome", icon: MessageCircle, label: "Babsi" },
    { key: "profile", icon: User, label: "Profile" },
  ];
  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: 420,
        background: "#0F1F19",
        borderTop: "1px solid #2C4239",
        display: "flex",
        padding: "8px 4px calc(8px + env(safe-area-inset-bottom))",
        zIndex: 10,
      }}
    >
      {items.map(({ key, icon: Icon, label }) => {
        const isActive = active === key;
        return (
          <button
            key={key}
            onClick={() => onNav(key)}
            style={{
              flex: 1,
              background: "none",
              border: "none",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              padding: "4px 0",
              cursor: "pointer",
              color: isActive ? "#E3B23C" : "#7C8B82",
            }}
          >
            <Icon size={20} strokeWidth={isActive ? 2.4 : 2} />
            <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 500 }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

function LeafCluster({ mastery, locked, size = 1 }) {
  const count = locked ? 3 : Math.max(3, Math.round((mastery / 100) * 7) + 2);
  const color = locked ? "#4B5A52" : mastery > 70 ? "#8FDC79" : mastery > 30 ? "#7FBF6B" : "#5C8F53";
  const veinColor = locked ? "#3A4640" : "#12241D";
  const glow = !locked && mastery > 70;
  return (
    <svg width={40 * size} height={30 * size} viewBox="0 0 40 30">
      {Array.from({ length: count }).map((_, i) => {
        const x = 4 + (i % 4) * 9 + (Math.floor(i / 4) % 2) * 4;
        const y = 4 + Math.floor(i / 4) * 9;
        const rot = (i * 37) % 60 - 30;
        return (
          <g
            key={i}
            transform={`translate(${x} ${y}) rotate(${rot})`}
            opacity={locked ? 0.35 : 0.55 + (i % 3) * 0.15}
            style={glow ? { filter: "drop-shadow(0 0 3px #E3B23C88)" } : undefined}
          >
            {/* leaf blade: pointed oval, wider near the stem end */}
            <path d="M0 4 Q -4.5 -1 0 -5 Q 4.5 -1 0 4 Z" fill={color} />
            {/* center vein */}
            <line x1="0" y1="3" x2="0" y2="-4" stroke={veinColor} strokeWidth="0.5" opacity="0.5" />
          </g>
        );
      })}
    </svg>
  );
}

function BigTree({ subjects, level, xp }) {
  const names = Object.values(subjects);
  const overall =
    names.reduce((s, subj) => {
      const t = Object.values(subj.topics || {});
      if (!t.length) return s;
      return s + t.reduce((a, x) => a + x.mastery, 0) / t.length;
    }, 0) / Math.max(1, names.filter((s) => Object.keys(s.topics).length).length);

  const trunkHeight = 90 + Math.min(40, overall * 0.4);
  return (
    <div style={{ position: "relative", display: "flex", justifyContent: "center", padding: "8px 0 4px" }}>
      <svg width="260" height="210" viewBox="0 0 260 210">
        <ellipse cx="130" cy="198" rx="90" ry="10" fill="#0A1712" opacity="0.5" />
        <path
          d={`M130 205 C 122 ${205 - trunkHeight * 0.5}, 118 ${205 - trunkHeight}, 130 ${205 - trunkHeight - 14}`}
          stroke="#5A3D2B"
          strokeWidth="14"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d={`M126 ${205 - trunkHeight * 0.35} C 90 ${205 - trunkHeight * 0.55}, 70 ${205 - trunkHeight * 0.7}, 55 ${205 - trunkHeight * 0.85}`}
          stroke="#5A3D2B"
          strokeWidth="7"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d={`M132 ${205 - trunkHeight * 0.5} C 165 ${205 - trunkHeight * 0.68}, 185 ${205 - trunkHeight * 0.8}, 205 ${205 - trunkHeight * 0.9}`}
          stroke="#5A3D2B"
          strokeWidth="7"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d={`M129 ${205 - trunkHeight - 6} C 129 ${205 - trunkHeight - 30}, 129 ${205 - trunkHeight - 45}, 129 ${205 - trunkHeight - 55}`}
          stroke="#5A3D2B"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
        />
        {[
          { x: 40, y: 205 - trunkHeight * 0.9 - 20 },
          { x: 195, y: 205 - trunkHeight * 0.95 - 18 },
          { x: 129, y: 205 - trunkHeight - 65 },
          { x: 90, y: 205 - trunkHeight * 0.5 - 10 },
          { x: 165, y: 205 - trunkHeight * 0.6 - 8 },
        ].map((pos, i) => (
          <g key={i} transform={`translate(${pos.x - 20}, ${pos.y - 15})`}>
            <LeafCluster mastery={40 + overall * 0.6 + i * 4} locked={false} size={1.15} />
          </g>
        ))}
      </svg>
      <div style={{ position: "absolute", top: 6, right: 4, textAlign: "right" }}>
        <div style={{ fontFamily: "Fraunces", fontSize: 13, color: "#E3B23C", fontWeight: 600 }}>Lvl {level}</div>
        <div style={{ fontFamily: "Manrope", fontSize: 11, color: "#B9C4BB" }}>{xp} XP</div>
      </div>
    </div>
  );
}

function Card({ children, onClick, locked, style }) {
  return (
    <button
      onClick={locked ? undefined : onClick}
      style={{
        width: "100%",
        textAlign: "left",
        background: locked ? "#1B332A88" : "#1B332A",
        border: locked ? "1px solid #2C4239" : "1px solid #2C4239",
        borderRadius: 14,
        padding: "14px 16px",
        marginBottom: 10,
        cursor: locked ? "default" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        opacity: locked ? 0.55 : 1,
        transition: "transform 0.15s, border-color 0.15s",
        ...style,
      }}
      onMouseEnter={(e) => !locked && (e.currentTarget.style.borderColor = "#7FBF6B88")}
      onMouseLeave={(e) => !locked && (e.currentTarget.style.borderColor = "#2C4239")}
    >
      {children}
    </button>
  );
}

function TopBar({ title, onBack }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 4px 14px" }}>
      {onBack && (
        <button
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            color: "#F4EDDD",
            cursor: "pointer",
            padding: 4,
            display: "flex",
          }}
        >
          <ChevronLeft size={22} />
        </button>
      )}
      <div style={{ fontFamily: "Fraunces", fontSize: 20, fontWeight: 600, color: "#F4EDDD" }}>{title}</div>
    </div>
  );
}

function ProgressBar({ value, color = "#7FBF6B" }) {
  return (
    <div style={{ width: 60, height: 6, background: "#0F1F19", borderRadius: 4, overflow: "hidden" }}>
      <div style={{ width: `${value}%`, height: "100%", background: color, borderRadius: 4 }} />
    </div>
  );
}

function InstallBanner({ platform, onInstallClick, onDismiss }) {
  if (platform === "none") return null;
  return (
    <div
      style={{
        background: "#1B332A",
        border: "1px solid #E3B23C55",
        borderRadius: 14,
        padding: "10px 12px",
        marginBottom: 14,
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 9,
          background: "#E3B23C",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {platform === "ios" ? <Share size={16} color="#12241D" /> : <Download size={16} color="#12241D" />}
      </div>
      <div style={{ flex: 1 }}>
        {platform === "android" && (
          <>
            <div style={{ fontSize: 12.5, fontWeight: 700 }}>Install BAOBAB</div>
            <div style={{ fontSize: 11, color: "#9FB0A6" }}>Add it to your home screen — opens like an app.</div>
          </>
        )}
        {platform === "ios" && (
          <>
            <div style={{ fontSize: 12.5, fontWeight: 700 }}>Install on iPhone</div>
            <div style={{ fontSize: 11, color: "#9FB0A6" }}>
              Tap <Share size={11} style={{ verticalAlign: "-1px" }} /> Share, then "Add to Home Screen"
            </div>
          </>
        )}
      </div>
      {platform === "android" && (
        <button
          onClick={onInstallClick}
          style={{
            background: "#E3B23C",
            color: "#12241D",
            border: "none",
            borderRadius: 8,
            padding: "7px 12px",
            fontWeight: 800,
            fontSize: 12,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Install
        </button>
      )}
      <button onClick={onDismiss} style={{ background: "none", border: "none", color: "#9FB0A6", cursor: "pointer", padding: 4 }}>
        <X size={15} />
      </button>
    </div>
  );
}

function MinistryAdminScreen({ onBack }) {
  const [docs, setDocs] = useState(initialCurriculumDocs);

  function simulateUpload() {
    setDocs((d) => [...d, { name: `Untitled scheme of work ${d.length + 1}.pdf`, status: "pending review" }]);
  }

  return (
    <div>
      <TopBar title="🇺🇬 Ministry / Admin" onBack={onBack} />
      <div style={{ fontSize: 12, color: "#9FB0A6", marginBottom: 16, lineHeight: 1.5 }}>
        National view — anonymized indicators, and the curriculum library Babsi grounds its lessons in.
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        {[
          { label: "Schools live", val: "412" },
          { label: "Districts covered", val: "38" },
          { label: "Avg mastery", val: "64%" },
        ].map((s) => (
          <div key={s.label} style={{ flex: 1, background: "#1B332A", borderRadius: 12, padding: "10px 8px", textAlign: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#E3B23C" }}>{s.val}</div>
            <div style={{ fontSize: 9.5, color: "#9FB0A6" }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ fontFamily: "Fraunces", fontSize: 15, marginBottom: 10, color: "#D9CEB4" }}>Curriculum Library</div>
      <div style={{ fontSize: 11, color: "#9FB0A6", marginBottom: 10, lineHeight: 1.5 }}>
        Verified documents here are what Babsi retrieves from when teaching or generating tasks — not its
        general knowledge. "Pending review" material isn't used until approved.
      </div>

      {docs.map((d, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#1B332A",
            border: "1px solid #2C4239",
            borderRadius: 10,
            padding: "10px 12px",
            marginBottom: 6,
          }}
        >
          <span style={{ fontSize: 12, color: "#F4EDDD" }}>{d.name}</span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: "3px 8px",
              borderRadius: 8,
              background: d.status === "verified" ? "#2E5A2A" : "#5A4A2A",
              color: d.status === "verified" ? "#8FDC79" : "#E3B23C",
              whiteSpace: "nowrap",
            }}
          >
            {d.status === "verified" ? "✓ verified" : "pending"}
          </span>
        </div>
      ))}

      <button
        onClick={simulateUpload}
        style={{
          width: "100%",
          marginTop: 10,
          background: "none",
          border: "1px dashed #2C4239",
          borderRadius: 10,
          padding: "14px",
          color: "#9FB0A6",
          fontSize: 12.5,
          cursor: "pointer",
        }}
      >
        ⬆ Upload curriculum document (demo)
      </button>
    </div>
  );
}

export default function Baobab() {
  const [subjects, setSubjects] = useState(initialSubjects);
  const [screen, setScreen] = useState("roleSelect");
  const [nav, setNav] = useState({});
  const [xp, setXp] = useState(4280);
  const [streak] = useState(14);
  const [level, setLevel] = useState(18);
  const [practiceIdx, setPracticeIdx] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [babsiMsgs, setBabsiMsgs] = useState([]);
  const [babsiInput, setBabsiInput] = useState("");
  const [babsiTyping, setBabsiTyping] = useState(false);
  const [bossResult, setBossResult] = useState(null);
  const [daysInactive, setDaysInactive] = useState(0);
  const [track, setTrack] = useState(null);
  const [leaderExpanded, setLeaderExpanded] = useState(false);

  const displaySubjects = useMemo(() => withDecay(subjects, daysInactive), [subjects, daysInactive]);
  const showBottomNav = ["dashboard", "progress", "babsiHome", "profile", "subjectTree", "topicHub"].includes(screen);

  // ---- Install-as-app handling ----
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installDismissed, setInstallDismissed] = useState(false);
  const [installPlatform, setInstallPlatform] = useState("none");

  useEffect(() => {
    const ua = window.navigator.userAgent || "";
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;

    if (isStandalone) {
      setInstallPlatform("none"); // already installed, nothing to show
    } else if (isIOS) {
      setInstallPlatform("ios"); // Safari never fires beforeinstallprompt — show manual steps
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setInstallPlatform("android"); // Chrome/Android (and some desktop Chrome) fired the real prompt
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstallClick() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setInstallDismissed(true);
  }

  // ---- Offline detection ----
  const [isOffline, setIsOffline] = useState(typeof navigator !== "undefined" ? !navigator.onLine : false);
  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  // ---- Notification permission (for streak reminders) ----
  const [notifPermission, setNotifPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );
  async function requestNotifPermission() {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    setNotifPermission(result);
  }

  // ---- Read-aloud (Web Speech API) ----
  const [speaking, setSpeaking] = useState(false);
  function readAloud(text) {
    if (typeof window.speechSynthesis === "undefined") return;
    window.speechSynthesis.cancel();
    const utter = new window.SpeechSynthesisUtterance(text);
    utter.rate = 0.95;
    utter.onstart = () => setSpeaking(true);
    utter.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(utter);
  }

  const subject = nav.subjectKey ? displaySubjects[nav.subjectKey] : null;
  const topic = nav.topicKey ? subject.topics[nav.topicKey] : null;
  const subtopic = nav.subtopicKey ? topic.subtopics[nav.subtopicKey] : null;

  function goto(next, extra = {}) {
    setScreen(next);
    setNav((n) => ({ ...n, ...extra }));
  }

  function startBabsi() {
    setBabsiMsgs([
      { from: "babsi", text: `Hey! 🌱 Ready to look at ${subtopic.name} together?` },
      { from: "babsi", text: subtopic.lesson.teach },
      { from: "babsi", text: "Want to try one together first, or jump straight into practice?" },
    ]);
    goto("babsi");
  }

  function sendBabsi() {
    if (!babsiInput.trim()) return;
    const userText = babsiInput.trim();
    setBabsiMsgs((m) => [...m, { from: "student", text: userText }]);
    setBabsiInput("");
    setBabsiTyping(true); // shows immediately — this is a live call, unlike the pre-cached lesson text above
    setTimeout(() => {
      setBabsiTyping(false);
      setBabsiMsgs((m) => [
        ...m,
        {
          from: "babsi",
          text:
            "Good thinking. Here's the trick: only terms with the exact same letter can join up — x's with x's, plain numbers with plain numbers. Mix a number and an x-term and they just sit next to each other, they don't combine. Feeling ready for practice?",
        },
      ]);
    }, 900);
  }

  function answerPractice(i) {
    if (selectedOpt !== null) return;
    setSelectedOpt(i);
    const q = subtopic.lesson.practice[practiceIdx];
    const correct = i === q.answer;
    setFeedback(correct ? "correct" : "wrong");
    setXp((x) => x + (correct ? 15 : 5));
  }

  function nextPractice() {
    setSelectedOpt(null);
    setFeedback(null);
    if (practiceIdx + 1 < subtopic.lesson.practice.length) {
      setPracticeIdx((i) => i + 1);
    } else {
      setPracticeIdx(0);
      goto("boss");
    }
  }

  function answerBoss(i) {
    const q = subtopic.lesson.boss;
    const correct = i === q.answer;
    setBossResult(correct ? "win" : "retry");
    if (correct) {
      const gained = 150;
      setXp((x) => x + gained);
      setLevel((l) => l + (xp + gained > (level + 1) * 250 ? 1 : 0));
      setSubjects((prev) => {
        const copy = structuredClone(prev);
        const st = copy[nav.subjectKey].topics[nav.topicKey].subtopics[nav.subtopicKey];
        st.mastery = 100;
        const topicObj = copy[nav.subjectKey].topics[nav.topicKey];
        const vals = Object.values(topicObj.subtopics).map((s) => s.mastery);
        topicObj.mastery = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
        return copy;
      });
    }
  }

  const wrap = {
    fontFamily: "Manrope",
    maxWidth: 420,
    margin: "0 auto",
    minHeight: "100vh",
    background: "linear-gradient(180deg,#12241D 0%,#0F1F19 100%)",
    color: "#F4EDDD",
    padding: showBottomNav ? "18px 18px 84px" : "18px 18px 40px",
    boxSizing: "border-box",
    position: "relative",
  };

  return (
    <div style={wrap}>
      <style>{`
        ${FONT_IMPORT}
        * { box-sizing: border-box; }
        button { font-family: inherit; }
      `}</style>

      {screen === "roleSelect" && (
        <div style={{ textAlign: "center", paddingTop: 50 }}>
          <svg width="86" height="70" viewBox="0 0 260 210" style={{ margin: "0 auto 6px", display: "block" }}>
            <path d="M130 205 C 122 175, 118 145, 130 120" stroke="#5A3D2B" strokeWidth="10" fill="none" strokeLinecap="round" />
            <ellipse cx="130" cy="90" rx="22" ry="14" fill="#8FDC79" transform="rotate(-8 130 90)" />
            <ellipse cx="100" cy="102" rx="18" ry="12" fill="#7FBF6B" opacity="0.9" transform="rotate(14 100 102)" />
            <ellipse cx="160" cy="100" rx="18" ry="12" fill="#7FBF6B" opacity="0.9" transform="rotate(-16 160 100)" />
            <ellipse cx="115" cy="68" rx="15" ry="10" fill="#8FDC79" transform="rotate(4 115 68)" />
            <ellipse cx="148" cy="66" rx="15" ry="10" fill="#E3B23C" opacity="0.9" transform="rotate(-6 148 66)" />
          </svg>
          <div style={{ fontFamily: "Fraunces", fontSize: 26, fontWeight: 700, marginBottom: 2 }}>BAOBAB</div>
          <div style={{ fontSize: 11, color: "#9FB0A6", letterSpacing: 0.5, marginBottom: 40 }}>
            LEVEL UP YOUR EDUCATION
          </div>
          <button
            onClick={() => goto("welcome")}
            style={{
              width: "100%",
              background: "#E3B23C",
              color: "#12241D",
              border: "none",
              borderRadius: 12,
              padding: "15px",
              fontWeight: 800,
              fontSize: 15,
              cursor: "pointer",
              marginBottom: 22,
            }}
          >
            Continue as Student
          </button>
          <button
            onClick={() => goto("otherRoles")}
            style={{ background: "none", border: "none", color: "#9FB0A6", fontSize: 13, cursor: "pointer", textDecoration: "underline" }}
          >
            Other users (Parent, School, Ministry)
          </button>
        </div>
      )}

      {screen === "otherRoles" && (
        <div>
          <TopBar title="Sign in as" onBack={() => goto("roleSelect")} />
          {[
            { key: "parentPlaceholder", label: "👨‍👩‍👧 Parent", desc: "Track your child's progress, report cards, announcements" },
            { key: "schoolPlaceholder", label: "🏫 School", desc: "Enroll students, manage teachers, class-level insight" },
            { key: "ministryAdmin", label: "🇺🇬 Ministry / Admin", desc: "National indicators, curriculum library" },
          ].map((r) => (
            <Card key={r.key} onClick={() => goto(r.key)}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{r.label}</div>
                <div style={{ fontSize: 11, color: "#9FB0A6" }}>{r.desc}</div>
              </div>
              <span style={{ fontSize: 16 }}>→</span>
            </Card>
          ))}
        </div>
      )}

      {(screen === "parentPlaceholder" || screen === "schoolPlaceholder") && (
        <div style={{ textAlign: "center", paddingTop: 40 }}>
          <TopBar title={screen === "parentPlaceholder" ? "Parent view" : "School view"} onBack={() => goto("otherRoles")} />
          <BabsiFace mood="neutral" size={50} />
          <div style={{ fontSize: 13, color: "#D9CEB4", marginTop: 14, padding: "0 20px", lineHeight: 1.6 }}>
            This prototype focuses on the student experience. The {screen === "parentPlaceholder" ? "Parent" : "School"} dashboard
            (report cards, announcements, {screen === "parentPlaceholder" ? "fee visibility" : "class-level insight and Holiday Package tools"})
            is spec'd in our discussion — happy to prototype it next if useful.
          </div>
          {screen === "schoolPlaceholder" && (
            <div style={{ margin: "18px 20px 0", background: "#1B332A", border: "1px solid #E3B23C33", borderRadius: 12, padding: 12, fontSize: 12, color: "#D9CEB4", lineHeight: 1.5 }}>
              💡 Pro doesn't have to be paid by the school itself — a sponsor (an alumni group, an NGO, a company) should be able to cover a school's Pro subscription on its behalf.
            </div>
          )}
        </div>
      )}

      {screen === "ministryAdmin" && (
        <MinistryAdminScreen onBack={() => goto("otherRoles")} />
      )}

      {screen === "welcome" && (
        <div style={{ textAlign: "center", paddingTop: 30 }}>
          <div style={{ fontFamily: "Fraunces", fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
            Welcome to BAOBAB
          </div>
          <div style={{ fontSize: 12, color: "#9FB0A6", marginBottom: 30 }}>Every learner starts with a seed.</div>
          <svg width="140" height="140" viewBox="0 0 140 140" style={{ margin: "0 auto", display: "block" }}>
            <ellipse cx="70" cy="128" rx="55" ry="8" fill="#0A1712" opacity="0.5" />
            <path d="M70 128 C 68 118, 68 108, 70 100" stroke="#5A3D2B" strokeWidth="4" fill="none" strokeLinecap="round" />
            <ellipse cx="66" cy="98" rx="7" ry="4.5" fill="#8FDC79" transform="rotate(-25 66 98)" />
            <ellipse cx="76" cy="99" rx="6" ry="4" fill="#7FBF6B" transform="rotate(20 76 99)" />
            <ellipse cx="70" cy="130" rx="10" ry="6" fill="#3E2B23" />
          </svg>
          <div style={{ margin: "26px 0", fontSize: 14, color: "#D9CEB4", lineHeight: 1.6 }}>
            <BabsiFace mood="happy" size={54} />
            <div style={{ marginTop: 10 }}>
              Hi, I'm Babsi 🌱 — as you learn, this seed grows into your own tree.
              Every lesson, every topic mastered, it grows a little more.
            </div>
          </div>
          <button
            onClick={() => goto("dashboard")}
            style={{
              width: "100%",
              background: "#E3B23C",
              color: "#12241D",
              border: "none",
              borderRadius: 12,
              padding: "13px",
              fontWeight: 800,
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            Plant my tree →
          </button>
        </div>
      )}

      {screen === "dashboard" && (
        <div>
          {!installDismissed && (
            <InstallBanner
              platform={installPlatform}
              onInstallClick={handleInstallClick}
              onDismiss={() => setInstallDismissed(true)}
            />
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <div>
              <div style={{ fontFamily: "Fraunces", fontSize: 22, fontWeight: 700 }}>BAOBAB</div>
              <div style={{ fontSize: 11, color: "#9FB0A6", letterSpacing: 0.5 }}>LEVEL UP YOUR EDUCATION</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, background: "#1B332A", padding: "6px 10px", borderRadius: 20 }}>
              <Flame size={16} color="#E3B23C" />
              <span style={{ fontSize: 13, fontWeight: 700 }}>{streak}</span>
            </div>
          </div>

          {isOffline && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "#2A2A1B",
                border: "1px solid #E3B23C33",
                borderRadius: 10,
                padding: "8px 12px",
                margin: "10px 0 0",
                fontSize: 11.5,
                color: "#E3B23C",
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#E3B23C", flexShrink: 0 }} />
              You're offline — showing saved content. Progress will sync once you're back online.
            </div>
          )}

          {daysInactive >= 3 && (
            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                background: "#1B332A",
                border: "1px solid #E3B23C33",
                borderRadius: 14,
                padding: "10px 12px",
                margin: "10px 0",
              }}
            >
              <BabsiFace mood="concerned" size={34} />
              <div style={{ fontSize: 12, color: "#D9CEB4", lineHeight: 1.4 }}>
                A few leaves fell while you were away — nothing lost for good. A quick review brings them right back.
              </div>
            </div>
          )}

          <BigTree subjects={displaySubjects} level={level} xp={xp} />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "#1B332A55",
              border: "1px dashed #2C4239",
              borderRadius: 10,
              padding: "6px 10px",
              margin: "4px 0 10px",
            }}
          >
            <span style={{ fontSize: 10, color: "#7C8B82" }}>Demo: simulate days away</span>
            <div style={{ display: "flex", gap: 4 }}>
              {[0, 3, 7, 14].map((d) => (
                <button
                  key={d}
                  onClick={() => setDaysInactive(d)}
                  style={{
                    background: daysInactive === d ? "#E3B23C" : "#12241D",
                    color: daysInactive === d ? "#12241D" : "#9FB0A6",
                    border: "none",
                    borderRadius: 6,
                    padding: "3px 7px",
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>

          <div style={{ fontFamily: "Fraunces", fontSize: 15, margin: "10px 0 8px", color: "#D9CEB4" }}>
            Your subjects
          </div>
          {Object.entries(displaySubjects).map(([key, s]) => {
            const t = Object.values(s.topics);
            const avg = t.length ? Math.round(t.reduce((a, x) => a + x.mastery, 0) / t.length) : null;
            return (
              <Card key={key} onClick={() => goto("subjectTree", { subjectKey: key })} locked={!t.length}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 20 }}>{s.emoji}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: "#9FB0A6" }}>{t.length ? `${t.length} topics` : "Coming soon"}</div>
                  </div>
                </div>
                {avg !== null && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <ProgressBar value={avg} />
                    <span style={{ fontSize: 12, color: "#9FB0A6" }}>{avg}%</span>
                  </div>
                )}
              </Card>
            );
          })}

          <button
            onClick={() => goto("addSubject")}
            style={{
              width: "100%",
              background: "none",
              border: "1px dashed #2C4239",
              borderRadius: 14,
              padding: "12px",
              color: "#9FB0A6",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              marginBottom: 4,
            }}
          >
            + Add a subject
          </button>

          <div
            onClick={() => goto("bestWeek")}
            style={{
              cursor: "pointer",
              background: "linear-gradient(135deg,#2A3F2E,#1B332A)",
              border: "1px solid #E3B23C33",
              borderRadius: 14,
              padding: 14,
              marginTop: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontSize: 12, color: "#E3B23C", fontWeight: 700, marginBottom: 2 }}>🏆 BEST OF THE WEEK</div>
              <div style={{ fontSize: 11, color: "#9FB0A6" }}>You're #3 this week — see the leaderboard</div>
            </div>
            <span style={{ fontSize: 18 }}>→</span>
          </div>

          <div
            style={{
              marginTop: 14,
              background: "#1B332A",
              border: "1px solid #2C4239",
              borderRadius: 14,
              padding: 14,
            }}
          >
            <div style={{ fontSize: 12, color: "#9FB0A6", marginBottom: 4 }}>RECOMMENDED NEXT</div>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Finish Expressions in Algebra</div>
            <button
              onClick={() =>
                goto("lessonOverview", { subjectKey: "mathematics", topicKey: "algebra", subtopicKey: "expressions" })
              }
              style={{
                background: "#7FBF6B",
                color: "#0F1F19",
                border: "none",
                borderRadius: 10,
                padding: "9px 14px",
                fontWeight: 800,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Continue learning →
            </button>
          </div>
        </div>
      )}

      {screen === "subjectTree" && subject && (
        <div>
          <TopBar title={`${subject.emoji} ${subject.name}`} onBack={() => goto("dashboard")} />
          {Object.entries(subject.topics).map(([key, t]) => (
            <Card key={key} locked={t.locked} onClick={() => goto("topicHub", { topicKey: key })}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <LeafCluster mastery={t.mastery} locked={t.locked} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{t.name}</div>
                  {t.locked && (
                    <div style={{ fontSize: 11, color: "#9FB0A6", display: "flex", alignItems: "center", gap: 4 }}>
                      <Lock size={11} /> Locked
                    </div>
                  )}
                </div>
              </div>
              {!t.locked && <span style={{ fontSize: 13, fontWeight: 700, color: "#7FBF6B" }}>{t.mastery}%</span>}
            </Card>
          ))}
        </div>
      )}

      {screen === "topicHub" && topic && (
        <div>
          <TopBar title={topic.name} onBack={() => goto("subjectTree")} />
          {Object.entries(topic.subtopics).map(([key, s]) => (
            <Card
              key={key}
              locked={s.locked}
              onClick={() => goto("lessonOverview", { subtopicKey: key })}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18 }}>{s.locked ? "🔒" : s.mastery >= 100 ? "🍎" : "🍏"}</span>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{s.name}</div>
              </div>
              {!s.locked && <span style={{ fontSize: 13, color: "#9FB0A6" }}>{s.mastery}%</span>}
            </Card>
          ))}
        </div>
      )}

      {screen === "lessonOverview" && subtopic && (
        <div>
          <TopBar title={subtopic.name} onBack={() => goto("topicHub")} />
          <div style={{ fontSize: 13, color: "#D9CEB4", marginBottom: 10 }}>You'll learn:</div>
          {subtopic.lesson.youllLearn.map((y, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, fontSize: 14 }}>
              <Sparkles size={14} color="#E3B23C" /> {y}
            </div>
          ))}
          <button
            onClick={startBabsi}
            style={{
              marginTop: 16,
              width: "100%",
              background: "#E3B23C",
              color: "#12241D",
              border: "none",
              borderRadius: 12,
              padding: "13px",
              fontWeight: 800,
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            Start Lesson
          </button>
        </div>
      )}

      {screen === "babsi" && subtopic && (
        <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 36px)" }}>
          <TopBar title="🤖 Babsi" onBack={() => goto("lessonOverview")} />
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
            {babsiMsgs.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.from === "babsi" ? "flex-start" : "flex-end",
                  background: m.from === "babsi" ? "#1B332A" : "#7FBF6B",
                  color: m.from === "babsi" ? "#F4EDDD" : "#0F1F19",
                  padding: "10px 13px",
                  borderRadius: 14,
                  fontSize: 13.5,
                  maxWidth: "85%",
                  lineHeight: 1.4,
                  display: "flex",
                  alignItems: "flex-end",
                  gap: 8,
                }}
              >
                <span>{m.text}</span>
                {m.from === "babsi" && (
                  <button
                    onClick={() => readAloud(m.text)}
                    aria-label="Read this message aloud"
                    style={{ background: "none", border: "none", padding: 0, cursor: "pointer", flexShrink: 0, color: speaking ? "#E3B23C" : "#7C8B82" }}
                  >
                    🔊
                  </button>
                )}
              </div>
            ))}
            {babsiTyping && (
              <div
                style={{
                  alignSelf: "flex-start",
                  background: "#1B332A",
                  padding: "10px 14px",
                  borderRadius: 14,
                  display: "flex",
                  gap: 4,
                }}
              >
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#9FB0A6",
                      animation: `baobabBounce 1s ${i * 0.15}s infinite`,
                    }}
                  />
                ))}
                <style>{`@keyframes baobabBounce { 0%,60%,100%{transform:translateY(0);opacity:0.5} 30%{transform:translateY(-4px);opacity:1} }`}</style>
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <input
              value={babsiInput}
              onChange={(e) => setBabsiInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendBabsi()}
              placeholder="Ask Babsi..."
              style={{
                flex: 1,
                background: "#1B332A",
                border: "1px solid #2C4239",
                borderRadius: 20,
                padding: "10px 14px",
                color: "#F4EDDD",
                fontSize: 13,
                outline: "none",
              }}
            />
            <button
              onClick={sendBabsi}
              style={{ background: "#E3B23C", border: "none", borderRadius: "50%", width: 38, height: 38, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <Send size={16} color="#12241D" />
            </button>
          </div>
          <button
            onClick={() => goto("practice")}
            style={{
              marginTop: 10,
              width: "100%",
              background: "#7FBF6B",
              color: "#0F1F19",
              border: "none",
              borderRadius: 12,
              padding: "12px",
              fontWeight: 800,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Go to Practice →
          </button>
        </div>
      )}

      {screen === "practice" && subtopic && (
        <div>
          <TopBar title="✍️ Practice" onBack={() => goto("babsi")} />
          <div style={{ fontSize: 12, color: "#9FB0A6", marginBottom: 6 }}>
            Question {practiceIdx + 1} of {subtopic.lesson.practice.length}
          </div>
          <div style={{ fontFamily: "Fraunces", fontSize: 18, marginBottom: 16, fontWeight: 600 }}>
            {subtopic.lesson.practice[practiceIdx].q}
          </div>
          {subtopic.lesson.practice[practiceIdx].options.map((opt, i) => {
            const isAnswer = i === subtopic.lesson.practice[practiceIdx].answer;
            let bg = "#1B332A";
            if (selectedOpt !== null) {
              if (isAnswer) bg = "#2E5A2A";
              else if (i === selectedOpt) bg = "#5A2A2A";
            }
            return (
              <button
                key={i}
                onClick={() => answerPractice(i)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  background: bg,
                  border: "1px solid #2C4239",
                  borderRadius: 12,
                  padding: "12px 14px",
                  marginBottom: 8,
                  color: "#F4EDDD",
                  fontSize: 14,
                  cursor: selectedOpt === null ? "pointer" : "default",
                }}
              >
                {opt}
              </button>
            );
          })}
          {feedback && (
            <div style={{ marginTop: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <BabsiFace mood={feedback === "correct" ? "happy" : "concerned"} size={30} />
                <div style={{ fontSize: 13, color: feedback === "correct" ? "#8FDC79" : "#E39C9C" }}>
                  {feedback === "correct" ? "Nice — that's right! +15 XP" : "Not quite — that's okay, mistakes are part of learning. +5 XP"}
                </div>
              </div>
              <button
                onClick={nextPractice}
                style={{
                  width: "100%",
                  background: "#E3B23C",
                  color: "#12241D",
                  border: "none",
                  borderRadius: 12,
                  padding: "12px",
                  fontWeight: 800,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                {practiceIdx + 1 < subtopic.lesson.practice.length ? "Next question →" : "Continue to Boss Battle →"}
              </button>
            </div>
          )}
        </div>
      )}

      {screen === "boss" && subtopic && (
        <div>
          <TopBar title="👑 Boss Battle" />
          {!bossResult && (
            <>
              <div
                style={{
                  background: "linear-gradient(135deg,#C9622B,#8F3F1B)",
                  borderRadius: 16,
                  padding: 18,
                  marginBottom: 16,
                  textAlign: "center",
                }}
              >
                <Crown size={28} color="#FFE9B8" />
                <div style={{ fontFamily: "Fraunces", fontWeight: 700, fontSize: 17, marginTop: 6 }}>
                  {subtopic.lesson.boss.title}
                </div>
              </div>
              <div style={{ fontFamily: "Fraunces", fontSize: 17, marginBottom: 14, fontWeight: 600 }}>
                {subtopic.lesson.boss.q}
              </div>
              {subtopic.lesson.boss.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => answerBoss(i)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    background: "#1B332A",
                    border: "1px solid #2C4239",
                    borderRadius: 12,
                    padding: "12px 14px",
                    marginBottom: 8,
                    color: "#F4EDDD",
                    fontSize: 14,
                    cursor: "pointer",
                  }}
                >
                  {opt}
                </button>
              ))}
            </>
          )}
          {bossResult === "retry" && (
            <div style={{ textAlign: "center", marginTop: 20 }}>
              <BabsiFace mood="concerned" size={44} />
              <div style={{ fontSize: 15, margin: "10px 0 14px" }}>Close! Review and try again.</div>
              <button
                onClick={() => setBossResult(null)}
                style={{ background: "#E3B23C", color: "#12241D", border: "none", borderRadius: 12, padding: "12px 20px", fontWeight: 800, cursor: "pointer" }}
              >
                Retry
              </button>
            </div>
          )}
          {bossResult === "win" && (
            <div style={{ textAlign: "center", marginTop: 10 }}>
              <BabsiFace mood="celebrate" size={54} />
              <div style={{ fontFamily: "Fraunces", fontSize: 22, fontWeight: 700, color: "#E3B23C", marginTop: 8 }}>
                🏆 BOSS DEFEATED
              </div>
              <div style={{ fontSize: 15, margin: "10px 0" }}>+150 XP</div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "#1B332A",
                  padding: "8px 14px",
                  borderRadius: 20,
                  marginBottom: 20,
                }}
              >
                <Star size={14} color="#E3B23C" /> {subtopic.lesson.boss.reward}
              </div>
              <button
                onClick={() => goto("results")}
                style={{
                  display: "block",
                  width: "100%",
                  background: "#7FBF6B",
                  color: "#0F1F19",
                  border: "none",
                  borderRadius: 12,
                  padding: "13px",
                  fontWeight: 800,
                  fontSize: 15,
                  cursor: "pointer",
                }}
              >
                See tree grow →
              </button>
            </div>
          )}
        </div>
      )}

      {screen === "progress" && (
        <div>
          <TopBar title="📈 My Progress" />
          {Object.entries(displaySubjects).map(([key, s]) => {
            const t = Object.entries(s.topics);
            if (!t.length) return null;
            const avg = Math.round(t.reduce((a, [, x]) => a + x.mastery, 0) / t.length);
            return (
              <div key={key} style={{ marginBottom: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>
                    {s.emoji} {s.name}
                  </span>
                  <span style={{ fontSize: 13, color: "#E3B23C", fontWeight: 700 }}>{avg}%</span>
                </div>
                {t.map(([tk, tv]) => (
                  <div key={tk} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0 6px 10px" }}>
                    <span style={{ fontSize: 12.5, color: tv.locked ? "#7C8B82" : "#D9CEB4" }}>{tv.name}</span>
                    <span style={{ fontSize: 12, color: "#9FB0A6" }}>{tv.locked ? "Locked" : `${tv.mastery}%`}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {screen === "profile" && (
        <div style={{ textAlign: "center" }}>
          <TopBar title="👤 Profile" />
          <BabsiFace mood="happy" size={70} />
          <div style={{ fontFamily: "Fraunces", fontSize: 20, fontWeight: 700, marginTop: 10 }}>Daniel</div>
          <div style={{ fontSize: 12, color: "#9FB0A6", marginBottom: 18 }}>🌱 BAOBAB Level {level}</div>
          <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 20 }}>
            <div style={{ background: "#1B332A", borderRadius: 12, padding: "12px 16px", flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#E3B23C" }}>{xp}</div>
              <div style={{ fontSize: 10, color: "#9FB0A6" }}>XP</div>
            </div>
            <div style={{ background: "#1B332A", borderRadius: 12, padding: "12px 16px", flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#E3B23C" }}>{streak}</div>
              <div style={{ fontSize: 10, color: "#9FB0A6" }}>Day streak</div>
            </div>
            <div style={{ background: "#1B332A", borderRadius: 12, padding: "12px 16px", flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#E3B23C" }}>27</div>
              <div style={{ fontSize: 10, color: "#9FB0A6" }}>Achievements</div>
            </div>
          </div>

          <button
            onClick={() => goto("trackSelect")}
            style={{
              width: "100%",
              textAlign: "left",
              background: "#1B332A",
              border: "1px solid #2C4239",
              borderRadius: 14,
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              color: "#F4EDDD",
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: "#9FB0A6", marginBottom: 3 }}>LEARNING PATH</div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>
                {track ? `${tracks[track].emoji} ${tracks[track].name}` : "Not chosen yet"}
              </div>
            </div>
            <span style={{ fontSize: 12, color: "#E3B23C" }}>Change →</span>
          </button>

          <div
            style={{
              width: "100%",
              background: "#1B332A",
              border: "1px solid #2C4239",
              borderRadius: 14,
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 10,
              textAlign: "left",
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: "#9FB0A6", marginBottom: 3 }}>STREAK REMINDERS</div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>
                {notifPermission === "granted"
                  ? "On — you'll get a gentle nudge if your streak is at risk"
                  : notifPermission === "denied"
                  ? "Off (blocked in browser settings)"
                  : "Off"}
              </div>
            </div>
            {notifPermission !== "granted" && notifPermission !== "denied" && (
              <button
                onClick={requestNotifPermission}
                style={{
                  background: "#E3B23C",
                  color: "#12241D",
                  border: "none",
                  borderRadius: 8,
                  padding: "7px 12px",
                  fontWeight: 800,
                  fontSize: 12,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                Turn on
              </button>
            )}
          </div>
        </div>
      )}

      {screen === "addSubject" && (
        <div>
          <TopBar title="Add a subject" onBack={() => goto("dashboard")} />
          <div style={{ fontSize: 12.5, color: "#9FB0A6", marginBottom: 14, lineHeight: 1.5 }}>
            Add an elective to your tree. Content for it unlocks as your school's curriculum library covers it.
          </div>
          {Object.entries(electivePool).filter(([key]) => !subjects[key]).map(([key, s]) => (
            <Card
              key={key}
              onClick={() => {
                setSubjects((prev) => ({ ...prev, [key]: s }));
                goto("dashboard");
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>{s.emoji}</span>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{s.name}</div>
              </div>
              <span style={{ fontSize: 18, color: "#7FBF6B" }}>+</span>
            </Card>
          ))}
          {Object.entries(electivePool).filter(([key]) => !subjects[key]).length === 0 && (
            <div style={{ textAlign: "center", color: "#9FB0A6", fontSize: 12.5, marginTop: 20 }}>
              You've added every available elective 🌱
            </div>
          )}
        </div>
      )}

      {screen === "trackSelect" && (
        <div>
          <TopBar title="Choose your path" onBack={() => goto("profile")} />
          <div style={{ fontSize: 12.5, color: "#9FB0A6", marginBottom: 14, lineHeight: 1.5 }}>
            This shapes which subjects lead your tree — but it's never locked. Change it anytime as you grow.
          </div>
          {Object.entries(tracks).map(([key, t]) => (
            <Card key={key} onClick={() => { setTrack(key); goto("profile"); }} style={{ flexDirection: "column", alignItems: "flex-start", border: track === key ? "1px solid #E3B23C" : undefined }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 18 }}>{t.emoji}</span>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{t.name}</span>
                {track === key && <Star size={13} color="#E3B23C" />}
              </div>
              <div style={{ fontSize: 11, color: "#9FB0A6", marginBottom: 3 }}>{t.example}</div>
              <div style={{ fontSize: 11.5, color: "#D9CEB4" }}>{t.blurb}</div>
            </Card>
          ))}
        </div>
      )}

      {screen === "bestWeek" && (
        <div>
          <TopBar title="🏆 Best of the Week" onBack={() => goto("dashboard")} />
          <div style={{ fontSize: 12, color: "#9FB0A6", marginBottom: 14 }}>
            Top 3 earn a bonus to start next week strong — everyone else, here's your target.
          </div>

          {/* Podium */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 10, marginBottom: 20 }}>
            {[leaderboardWeek[1], leaderboardWeek[0], leaderboardWeek[2]].map((p, i) => {
              const rank = [2, 1, 3][i];
              const height = [60, 78, 48][i];
              const color = rank === 1 ? "#E3B23C" : rank === 2 ? "#C7CDCB" : "#C9622B";
              const bonus = rank === 1 ? "+500 XP" : rank === 2 ? "+300 XP" : "+150 XP";
              return (
                <div key={p.name} style={{ textAlign: "center", width: 90 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 2 }}>{p.name}</div>
                  <div style={{ fontSize: 10, color: "#9FB0A6", marginBottom: 6 }}>{p.pts} pts</div>
                  <div
                    style={{
                      height,
                      background: color,
                      borderRadius: "8px 8px 0 0",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      paddingBottom: 6,
                      color: "#12241D",
                      fontWeight: 800,
                      fontSize: 15,
                    }}
                  >
                    #{rank}
                  </div>
                  <div style={{ fontSize: 9.5, color: "#E3B23C", marginTop: 4, fontWeight: 700 }}>{bonus}</div>
                </div>
              );
            })}
          </div>

          {(leaderExpanded ? leaderboardWeek : leaderboardWeek.slice(0, 8)).map((p, i) => (
            <div
              key={p.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 12px",
                marginBottom: 6,
                borderRadius: 10,
                background: p.isYou ? "#2A3F2E" : "#1B332A99",
                border: p.isYou ? "1px solid #E3B23C55" : "1px solid transparent",
              }}
            >
              <span style={{ fontSize: 12, width: 20, color: "#9FB0A6", fontWeight: 700 }}>{i + 1}</span>
              <span style={{ flex: 1, fontSize: 13, fontWeight: p.isYou ? 700 : 500 }}>{p.name}</span>
              <span style={{ fontSize: 12, color: "#E3B23C", fontWeight: 700 }}>{p.pts} pts</span>
            </div>
          ))}

          {!leaderExpanded && (
            <button
              onClick={() => setLeaderExpanded(true)}
              style={{
                width: "100%",
                background: "#1B332A",
                color: "#E3B23C",
                border: "1px solid #2C4239",
                borderRadius: 10,
                padding: "10px",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                marginTop: 4,
              }}
            >
              See all (top 20) →
            </button>
          )}
        </div>
      )}

      {screen === "babsiHome" && (
        <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 120px)" }}>
          <TopBar title="🤖 Ask Babsi" />
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, alignItems: "center", justifyContent: "center", textAlign: "center" }}>
            <BabsiFace mood="happy" size={60} />
            <div style={{ fontSize: 13, color: "#D9CEB4", padding: "0 20px" }}>
              Ask me about anything you're learning — or take a picture of a task from your book and I'll help you work through it.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <input
              placeholder="Ask Babsi..."
              style={{
                flex: 1,
                background: "#1B332A",
                border: "1px solid #2C4239",
                borderRadius: 20,
                padding: "10px 14px",
                color: "#F4EDDD",
                fontSize: 13,
                outline: "none",
              }}
            />
            <button
              style={{ background: "#E3B23C", border: "none", borderRadius: "50%", width: 38, height: 38, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <Send size={16} color="#12241D" />
            </button>
          </div>
        </div>
      )}

      {showBottomNav && (
        <BottomNav
          active={screen}
          onNav={(key) => {
            if (key === "dashboard") setNav({});
            goto(key);
          }}
        />
      )}
    </div>
  );
}
