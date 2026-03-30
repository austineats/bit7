import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

const px = { fontFamily: "'Press Start 2P', monospace" } as const;

const GIRL_NAMES = [
  "Vivian", "Grace", "Amy", "Jennifer", "Michelle", "Jessica", "Tiffany", "Stephanie",
  "Alice", "Cindy", "Emily", "Sophia", "Chloe", "Hannah", "Olivia", "Angela",
  "May", "Jane", "Cecilia", "Christine", "Nicole", "Kelly", "Linda", "Lisa",
  "Karen", "Nancy", "Catherine", "Rachel", "Esther", "Eunice", "Wendy", "Winnie",
  "Vicky", "Amber", "Crystal", "Mia", "Abigail", "Natalie", "Harper", "Evelyn",
  "Hana", "Mina", "Yuna", "Sakura", "Mei", "Jia", "Biyu", "Lan",
  "Xia", "Lian", "Meiling", "Ting", "An", "Bao", "Zhen", "Yue",
  "Fang", "Hui", "Aiko", "Yuki", "Emi", "Reina", "Mika", "Aya",
  "Rin", "Sora", "Miyuki", "Sayuri", "Misaki", "Nozomi", "Yui", "Tomoko",
  "Kyomi", "Airi", "Asako", "Chiyo", "Haruko", "Kaede", "Kasumi", "Midori",
  "Nami", "Riko", "Suzu", "Tsubaki", "Ume", "Yori", "Seoyeon", "Iseul",
  "Bora", "Eun", "Jina", "Sua", "Arin", "Seah", "Yena", "Jiwoo",
  "Haneul", "Nari", "Sarang", "Minji",
];

const BOY_NAMES = [
  "Andrew", "Eric", "Kevin", "Peter", "Albert", "David", "Daniel", "Jason",
  "Justin", "Michael", "Brian", "Brandon", "Ryan", "Alex", "Andy", "Alan",
  "Sam", "Ethan", "Noah", "Liam", "Lucas", "Aiden", "Nathan", "Tyler",
  "Benson", "Winston", "Edison", "Harrison", "Jackson", "Nelson", "Anson", "Kelvin",
  "Calvin", "Alvin", "Edward", "Jackie", "Felix", "Martin", "Terence", "Victor",
  "Vincent", "Clarence", "Richard", "Eugene", "Edwin", "Goodwin", "Kenji", "Hiroshi",
  "Takeshi", "Haruki", "Kaito", "Riku", "Itsuki", "Hinata", "Arata", "Hayato",
  "Takeru", "Renzo", "Kazuya", "Sho", "Daichi", "Kota", "Ryo", "Tomo",
  "Satoshi", "Minjun", "Seojun", "Dohyun", "Siwoo", "Yeojun", "Joon", "Yoon",
  "Sungho", "Taeyang", "Kwang", "Daehyun", "Jungwoo", "Gunwoo", "Hyunwoo", "Minho",
  "Jungkook", "Jimin", "Taehyung", "Seokjin", "Namjoon", "Yoongi", "Hoseok", "Ren", "Jin",
];


/* ─── Player slot ─── */
function PixelPlayer({ name, filled, color, ready, onInvite }: { name?: string; filled: boolean; color: "blue" | "pink"; ready?: boolean; onInvite?: () => void }) {
  const c = color === "blue" ? "#29adff" : "#ff77a8";
  const cDark = color === "blue" ? "#1a6b99" : "#993d64";

  return (
    <div className="flex flex-col items-center gap-3 w-[100px] sm:w-[140px]">
      <div
        className="w-full aspect-[3/4] flex items-center justify-center"
        style={{
          border: `4px solid ${filled ? c : "#5f574f"}`,
          borderStyle: filled ? "solid" : "dashed",
          background: filled ? "rgba(41,173,255,0.08)" : "#0d0d1a",
          boxShadow: filled ? `4px 4px 0 ${cDark}` : "none",
        }}
      >
        {filled ? (
          ready ? (
            <span className="text-[14px] sm:text-[16px] text-[#00e436]">READY</span>
          ) : (
            <span className="text-[10px] sm:text-[12px] text-[#ffec27]" style={{ animation: "blink-pixel 2s step-end infinite" }}>NOT READY</span>
          )
        ) : (
          <button
            onClick={onInvite}
            className="px-4 py-2 text-[9px] sm:text-[10px] active:translate-y-[2px]"
            style={{ border: `4px solid ${c}`, background: c, color: "#1d2b53", boxShadow: `3px 3px 0 ${cDark}` }}
          >
            INVITE
          </button>
        )}
      </div>
      <div
        className="w-full py-2 text-center text-[8px] sm:text-[9px]"
        style={{
          border: `4px solid ${filled ? c : "#5f574f"}`,
          background: filled ? c : "transparent",
          color: filled ? "#1d2b53" : "#5f574f",
          boxShadow: filled ? `3px 3px 0 ${cDark}` : "none",
        }}
      >
        {filled ? (name || "P1") : "???"}
      </div>
    </div>
  );
}



/* ─── TBD match slot with spinning name ─── */
function TbdPlayer({ index, matchGender }: { index: number; matchGender: "girl" | "boy" }) {
  const names = matchGender === "girl" ? GIRL_NAMES : BOY_NAMES;
  const c = matchGender === "girl" ? "#ff004d" : "#29adff";
  const cDark = matchGender === "girl" ? "#7e2553" : "#1a6b99";
  const [idx, setIdx] = useState(() => (index * 11) % names.length);

  useEffect(() => {
    const id = setInterval(() => {
      setIdx(prev => (prev + 1) % names.length);
    }, 100);
    return () => clearInterval(id);
  }, [names]);

  return (
    <div className="flex flex-col items-center gap-3 w-[100px] sm:w-[140px]">
      <div
        className="w-full aspect-[3/4] flex items-center justify-center"
        style={{
          border: `4px solid ${c}`,
          background: "#0d0d1a",
          boxShadow: `4px 4px 0 ${cDark}`,
        }}
      >
        <span className="text-[18px] sm:text-[22px]" style={{ color: c }}>TBD</span>
      </div>
      <div
        className="w-full py-2 text-center text-[7px] sm:text-[8px] overflow-hidden"
        style={{ border: `4px solid ${c}`, background: c, color: "#fff", boxShadow: `3px 3px 0 ${cDark}` }}
      >
        <span className="inline-block w-[70px] sm:w-[80px] text-center overflow-hidden">
          {names[idx % names.length]}</span>
      </div>
    </div>
  );
}

/* ─── Pixel VS badge ─── */
function VsBadge() {
  return (
    <div
      className="px-3 py-2 text-[14px] sm:text-[18px] text-[#ffec27] self-center shrink-0"
      style={{
        border: "4px solid #ffec27",
        background: "#1d2b53",
        boxShadow: "4px 4px 0 #998d17",
        textShadow: "2px 2px 0 #998d17",
      }}
    >
      VS
    </div>
  );
}

/* ═══ Team data type ═══ */
type TeamData = {
  player1: { name: string; gender: string; ready: boolean };
  player2: { name: string; gender: string; ready: boolean } | null;
};

/* ═══ Page ═══ */
export function InvitePage() {
  const { code } = useParams();
  const navigate = useNavigate();

  // Load initial data from sessionStorage (creator) or start empty (joiner)
  const stored = code ? sessionStorage.getItem(`bubl-invite-${code}`) : null;
  const initial = stored ? JSON.parse(stored) : null;

  const [team, setTeam] = useState<TeamData>({
    player1: initial ? { name: initial.name, gender: initial.gender || "male", ready: false } : { name: "...", gender: "male", ready: false },
    player2: null,
  });
  const [copied, setCopied] = useState(false);
  const [loaded, setLoaded] = useState(!!initial);

  const playerGender = team.player1.gender;
  const isFemale = playerGender === "girl" || playerGender === "female";
  const matchGender = isFemale ? "boy" : "girl";
  const teamFull = team.player2 !== null;
  const playerCount = teamFull ? 2 : 1;

  // Poll backend for team updates every 2s
  useEffect(() => {
    if (!code) return;
    let active = true;

    const poll = async () => {
      try {
        const res = await fetch(`/api/blind-date/team/${code}`);
        if (res.ok) {
          const data = await res.json();
          if (active && data.ok) {
            setTeam({
              player1: data.team.player1,
              player2: data.team.player2 || null,
            });
            setLoaded(true);
          }
        }
      } catch { /* ignore */ }
      // If backend didn't respond, still mark loaded after first attempt so we don't hang
      if (active) setLoaded(true);
    };

    poll();
    const interval = setInterval(poll, 2000);
    return () => { active = false; clearInterval(interval); };
  }, [code]);

  const inviteLink = `${window.location.origin}/join/${code}?from=${encodeURIComponent(team.player1.name)}`;

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ ...px, background: "#0d0d1a" }}>
        <p className="text-[#ffec27] text-[9px] sm:text-[11px] text-center" style={{ animation: "blink-pixel 1s step-end infinite" }}>
          LOADING...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-x-hidden" style={px}>
      {/* Background */}
      <div className="fixed inset-0 z-0" style={{ background: "#0d0d1a" }} />
      {/* Scanlines */}
      <div
        className="fixed inset-0 z-[1] pointer-events-none opacity-[0.04]"
        style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, #000 2px, #000 4px)" }}
      />
      {/* Grid */}
      <div
        className="fixed inset-0 z-[1] pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "8px 8px" }}
      />

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Nav */}
        <nav className="border-b-4 border-[#29adff] bg-[#1d2b53]/95">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
            <button onClick={() => navigate("/")} className="text-[#ff004d] text-[14px] sm:text-[18px]">bubl.</button>
            <span className="text-[#ffec27] text-[7px] sm:text-[9px]">&lt; PARTY UP &gt;</span>
          </div>
        </nav>

        {/* Main content */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-5 py-8 sm:py-12 gap-6 sm:gap-10">

          {/* Title */}
          <div className="text-center">
            <p className="text-[#ff77a8] text-[9px] sm:text-[10px] mb-3">&lt; DOUBLE DATE MODE &gt;</p>
            <h1 className="text-[16px] sm:text-[28px] lg:text-[34px] text-[#fff1e8] leading-[1.6]">
              {teamFull ? (
                <>Team <span className="text-[#00e436]">ready!</span></>
              ) : (
                <>Invite ur<br /><span className="text-[#ffec27]">teammate</span></>
              )}
            </h1>
          </div>

          {/* Player count */}
          <div
            className="px-4 sm:px-5 py-2 text-[8px] sm:text-[13px]"
            style={{
              border: `4px solid ${teamFull ? "#00e436" : "#ffec27"}`,
              background: "#1d2b53",
              color: teamFull ? "#00e436" : "#ffec27",
              boxShadow: `4px 4px 0 ${teamFull ? "#008751" : "#998d17"}`,
            }}
          >
            [ {playerCount} / 2 ] PLAYERS JOINED
          </div>

          {/* 2v2 Arena */}
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-4 lg:gap-8">
            <div className="flex gap-4 sm:gap-5">
              <PixelPlayer name={team.player1.name} filled ready={team.player1.ready} color={isFemale ? "pink" : "blue"} />
              {teamFull ? (
                <PixelPlayer name={team.player2!.name} filled ready={team.player2!.ready} color={isFemale ? "pink" : "blue"} />
              ) : (
                <PixelPlayer filled={false} color={isFemale ? "pink" : "blue"} onInvite={copyLink} />
              )}
            </div>

            <VsBadge />

            <div className="flex gap-4 sm:gap-5">
              <TbdPlayer index={1} matchGender={matchGender as "girl" | "boy"} />
              <TbdPlayer index={2} matchGender={matchGender as "girl" | "boy"} />
            </div>
          </div>

          {/* Message */}
          <p className="text-[#c2c3c7] text-[7px] sm:text-[10px] text-center leading-[2] sm:leading-[2.2] max-w-xs sm:max-w-sm px-2 break-words">
            {teamFull
              ? "Both teammates are in! bubl will find your match and text you on Thursday."
              : "Invite your friend to join your team. Once both slots are filled, bubl will find your match!"
            }
          </p>

          {/* Buttons */}
          {teamFull ? (
            <a
              href="sms:textbubl@icloud.com&body=bubl i've signed up!"
              className="px-6 sm:px-8 py-3 sm:py-4 text-[9px] sm:text-[13px] active:translate-x-[2px] active:translate-y-[2px] inline-block text-center"
              style={{
                border: "4px solid #00e436",
                background: "#00e436",
                color: "#1d2b53",
                boxShadow: "4px 4px 0 #008751",
              }}
            >
              &gt; READY UP — TEXT BUBL
            </a>
          ) : (
            <button
              onClick={copyLink}
              className="px-6 sm:px-8 py-3 sm:py-4 text-[9px] sm:text-[13px] active:translate-x-[2px] active:translate-y-[2px]"
              style={{
                border: "4px solid #ffec27",
                background: copied ? "#00e436" : "#ffec27",
                color: "#1d2b53",
                boxShadow: copied ? "4px 4px 0 #008751" : "4px 4px 0 #998d17",
              }}
            >
              {copied ? "LINK COPIED!" : "> INVITE FRIEND"}
            </button>
          )}

          {/* Status text */}
          <p
            className="text-[#5f574f] text-[7px] sm:text-[8px] uppercase"
            style={{ animation: "blink-pixel 1.5s step-end infinite" }}
          >
            {teamFull ? "text bubl to ready up..." : "waiting for player 2..."}
          </p>
        </div>
      </div>
    </div>
  );
}
