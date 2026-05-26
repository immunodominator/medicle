"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Analytics } from "@vercel/analytics/next";

type Case = {
  id: string;
  diagnosis: string;
  aliases: string[];
  clues: string[];
  teachingPoints: string[];
};

function parseCases(text: string): Case[] {
  const cases: Case[] = [];
  const blocks = text.split(/\nCASE_ID:/).filter(Boolean);
  for (const block of blocks) {
    const idMatch = block.match(/^[\s\S]*?(\d+)/);
    const diagMatch = block.match(/DIAGNOSIS:\s*\n([^\n]+)/);
    const aliasMatch = block.match(/ALIASES:\s*\n([\s\S]*?)(?=\nVIGNETTE_LINES:)/);
    const clueMatch = block.match(/VIGNETTE_LINES:\s*\n([\s\S]*?)(?=\nTEACHING_POINTS:|\nCASE_ID:|$)/);
    const teachMatch = block.match(/TEACHING_POINTS:\s*\n([\s\S]*?)(?=\n={10,}|\nCASE_ID:|$)/);
    if (!diagMatch || !clueMatch) continue;
    const diagnosis = diagMatch[1].trim();
    const aliases = aliasMatch
      ? aliasMatch[1].split("\n").map(a => a.replace(/^[-\s]+/, "").trim()).filter(Boolean)
      : [];
    const clues = clueMatch[1]
      .split("\n")
      .map(l => l.replace(/^\d+\.\s*/, "").trim())
      .filter(Boolean);
    const teachingPoints = teachMatch
      ? teachMatch[1].split("\n").map(t => t.replace(/^[-\s]+/, "").trim()).filter(Boolean)
      : [];
    cases.push({ id: idMatch?.[1] || "0", diagnosis, aliases, clues, teachingPoints });
  }
  return cases;
}

const MAX_GUESSES = 6;

const ECG_POINTS: [number, number][][] = [
  [[0,50],[20,50],[22,46],[24,54],[26,10],[28,90],[30,44],[32,50],[60,50],[62,46],[64,54],[66,10],[68,90],[70,44],[72,50],[100,50],[102,46],[104,54],[106,10],[108,90],[110,44],[112,50],[140,50],[142,46],[144,54],[146,10],[148,90],[150,44],[152,50],[180,50],[182,46],[184,54],[186,10],[188,90],[190,44],[192,50],[220,50],[222,46],[224,54],[226,10],[228,90],[230,44],[232,50],[260,50],[262,46],[264,54],[266,10],[268,90],[270,44],[272,50],[300,50]],
  [[0,50],[15,50],[17,45],[19,55],[21,8],[23,92],[25,43],[27,50],[47,50],[49,45],[51,55],[53,8],[55,92],[57,43],[59,50],[79,50],[81,45],[83,55],[85,8],[87,92],[89,43],[91,50],[111,50],[113,45],[115,55],[117,8],[119,92],[121,43],[123,50],[143,50],[145,45],[147,55],[149,8],[151,92],[153,43],[155,50],[175,50],[177,45],[179,55],[181,8],[183,92],[185,43],[187,50],[207,50],[209,45],[211,55],[213,8],[215,92],[217,43],[219,50],[239,50],[241,45],[243,55],[245,8],[247,92],[249,43],[251,50],[271,50],[273,45],[275,55],[277,8],[279,92],[281,43],[283,50],[300,50]],
  [[0,50],[12,50],[14,44],[16,56],[18,6],[20,94],[22,42],[24,50],[38,50],[40,56],[42,44],[44,50],[56,50],[58,44],[60,56],[62,6],[64,94],[66,42],[68,50],[82,50],[84,56],[86,44],[88,50],[100,50],[102,44],[104,56],[106,6],[108,94],[110,42],[112,50],[126,50],[128,56],[130,44],[132,50],[144,50],[146,44],[148,56],[150,6],[152,94],[154,42],[156,50],[170,50],[172,56],[174,44],[176,50],[188,50],[190,44],[192,56],[194,6],[196,94],[198,42],[200,50],[214,50],[216,56],[218,44],[220,50],[232,50],[234,44],[236,56],[238,6],[240,94],[242,42],[244,50],[258,50],[260,56],[262,44],[264,50],[276,50],[278,44],[280,56],[282,6],[284,94],[286,42],[288,50],[300,50]],
  [[0,50],[25,50],[27,58],[29,42],[31,5],[33,95],[35,58],[37,42],[39,50],[75,50],[77,58],[79,42],[81,5],[83,95],[85,58],[87,42],[89,50],[125,50],[127,58],[129,42],[131,5],[133,95],[135,58],[137,42],[139,50],[175,50],[177,58],[179,42],[181,5],[183,95],[185,58],[187,42],[189,50],[225,50],[227,58],[229,42],[231,5],[233,95],[235,58],[237,42],[239,50],[275,50],[277,58],[279,42],[281,5],[283,95],[285,58],[287,42],[289,50],[300,50]],
  [[0,50],[4,28],[8,72],[12,18],[16,82],[20,35],[24,65],[28,22],[32,78],[36,40],[40,60],[44,25],[48,75],[52,32],[56,68],[60,18],[64,82],[68,38],[72,62],[76,28],[80,72],[84,42],[88,58],[92,22],[96,78],[100,35],[104,65],[108,20],[112,80],[116,38],[120,62],[124,28],[128,72],[132,42],[136,58],[140,22],[144,78],[148,35],[152,65],[156,18],[160,82],[164,38],[168,62],[172,28],[176,72],[180,42],[184,58],[188,22],[192,78],[196,35],[200,65],[204,20],[208,80],[212,38],[216,62],[220,28],[224,72],[228,42],[232,58],[236,22],[240,78],[244,35],[248,65],[252,18],[256,82],[260,38],[264,62],[268,28],[272,72],[276,42],[280,58],[284,22],[288,78],[292,35],[296,65],[300,50]],
  [[0,50],[2,42],[4,63],[6,35],[8,70],[10,28],[12,58],[14,44],[16,67],[18,30],[20,55],[22,40],[24,68],[26,25],[28,72],[30,38],[32,56],[34,46],[36,65],[38,29],[40,60],[42,43],[44,70],[46,26],[48,55],[50,40],[52,68],[54,32],[56,58],[58,45],[60,71],[62,28],[64,53],[66,41],[68,66],[70,27],[72,60],[74,43],[76,70],[78,30],[80,55],[82,39],[84,68],[86,24],[88,72],[90,37],[92,56],[94,46],[96,63],[98,28],[100,58],[102,42],[104,67],[106,27],[108,55],[110,40],[112,70],[114,31],[116,57],[118,44],[120,71],[122,28],[124,53],[126,41],[128,65],[130,26],[132,60],[134,43],[136,68],[138,30],[140,55],[142,39],[144,70],[146,24],[148,72],[150,37],[152,56],[154,46],[156,62],[158,28],[160,58],[162,42],[164,67],[166,27],[168,55],[170,40],[172,70],[174,31],[176,57],[178,44],[180,71],[182,28],[184,53],[186,41],[188,65],[190,26],[192,60],[194,43],[196,68],[198,30],[200,55],[202,39],[204,70],[206,24],[208,72],[210,37],[212,56],[214,46],[216,63],[218,28],[220,58],[222,42],[224,67],[226,27],[228,55],[230,40],[232,70],[234,31],[236,57],[238,44],[240,71],[242,28],[244,53],[246,41],[248,65],[250,26],[252,60],[254,43],[256,68],[258,30],[260,55],[262,39],[264,70],[266,24],[268,72],[270,37],[272,56],[274,46],[276,62],[278,28],[280,58],[282,42],[284,67],[286,27],[288,55],[290,40],[292,70],[294,31],[296,57],[298,44],[300,50]],
];

const ECG_COLORS = ["#22c55e", "#84cc16", "#facc15", "#f97316", "#ef4444", "#dc2626"];
const ECG_X_SPEEDS = [0.8, 1.1, 1.4, 1.0, 2.0, 2.8];
const ECG_LABELS = ["Stable", "Ill-Appearing", "Distressed", "Obtunded", "Critical", "Peri-Arrest"];

function getYatX(points: [number, number][], x: number): number {
  for (let i = 0; i < points.length - 1; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    if (x >= x1 && x <= x2) {
      const t = (x - x1) / (x2 - x1);
      return y1 + t * (y2 - y1);
    }
  }
  return 50;
}

function ECGCanvas({ points, color, xSpeed, flatlined }: {
  points: [number, number][];
  color: string;
  xSpeed: number;
  flatlined: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dotXRef = useRef(0);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    const scaleX = W / 300;
    const scaleY = H / 100;

    const drawFrame = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = "#0d1f2d";
      ctx.lineWidth = 0.5;
      [25, 50, 75].forEach(y => {
        ctx.beginPath(); ctx.moveTo(0, y * scaleY); ctx.lineTo(W, y * scaleY); ctx.stroke();
      });
      [60, 120, 180, 240].forEach(x => {
        ctx.beginPath(); ctx.moveTo(x * scaleX, 0); ctx.lineTo(x * scaleX, H); ctx.stroke();
      });
      const drawPath = () => {
        if (flatlined) { ctx.moveTo(0, 50 * scaleY); ctx.lineTo(W, 50 * scaleY); }
        else { points.forEach(([x, y], i) => { if (i === 0) ctx.moveTo(x * scaleX, y * scaleY); else ctx.lineTo(x * scaleX, y * scaleY); }); }
      };
      ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 2.2; ctx.lineJoin = "round"; ctx.lineCap = "round";
      drawPath(); ctx.stroke();
      ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 6; ctx.globalAlpha = 0.12;
      drawPath(); ctx.stroke(); ctx.globalAlpha = 1;
      if (!flatlined) {
        dotXRef.current = (dotXRef.current + xSpeed) % 300;
        const dotY = getYatX(points, dotXRef.current);
        ctx.beginPath(); ctx.arc(dotXRef.current * scaleX, dotY * scaleY, 4, 0, Math.PI * 2);
        ctx.fillStyle = color; ctx.globalAlpha = 0.95; ctx.fill(); ctx.globalAlpha = 1;
      }
      animRef.current = requestAnimationFrame(drawFrame);
    };
    animRef.current = requestAnimationFrame(drawFrame);
    return () => cancelAnimationFrame(animRef.current);
  }, [points, color, xSpeed, flatlined]);

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={80}
      className="w-full rounded-xl"
      style={{ background: "#050a0e", display: "block" }}
    />
  );
}

function ECGMonitor({ badGuesses, gameOver, won, guessesLeft }: {
  badGuesses: number; gameOver: boolean; won: boolean; guessesLeft: number;
}) {
  const idx = won ? 0 : Math.min(badGuesses, ECG_POINTS.length - 1);
  const flatlined = gameOver && !won;
  const color = won ? "#22c55e" : flatlined ? "#dc2626" : ECG_COLORS[idx];
  const label = won ? "Patient Saved ✓" : flatlined ? "FLATLINE" : ECG_LABELS[idx];
  return (
    <div className="w-full rounded-2xl p-3 border" style={{ background: "#011a1f", borderColor: "#0e3d4a" }}>
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-xs font-mono tracking-widest" style={{ color }}>● {label}</span>
        {!gameOver && (
          <span className="text-xs font-mono" style={{ color: "#6b7280" }}>
            {guessesLeft} guess{guessesLeft !== 1 ? "es" : ""} left
          </span>
        )}
      </div>
      <ECGCanvas points={ECG_POINTS[idx]} color={color} xSpeed={ECG_X_SPEEDS[idx]} flatlined={flatlined} />
    </div>
  );
}

function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const colors = ["#14b8a6", "#22c55e", "#86efac", "#facc15", "#f97316", "#ffffff", "#a78bfa"];
    const pieces = Array.from({ length: 200 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height - canvas.height,
      r: Math.random() * 7 + 3, color: colors[Math.floor(Math.random() * colors.length)],
      tiltAngle: Math.random() * Math.PI * 2, tiltSpeed: Math.random() * 0.07 + 0.03,
      speed: Math.random() * 2.5 + 1.5,
    }));
    let animId: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach(p => {
        p.tiltAngle += p.tiltSpeed; p.y += p.speed;
        const tilt = Math.sin(p.tiltAngle) * 14;
        ctx.beginPath(); ctx.lineWidth = p.r; ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + tilt + p.r / 2, p.y); ctx.lineTo(p.x + tilt, p.y + tilt + p.r / 2); ctx.stroke();
        if (p.y > canvas.height) p.y = -10;
      });
      animId = requestAnimationFrame(draw);
    };
    draw();
    const stop = setTimeout(() => cancelAnimationFrame(animId), 5000);
    return () => { cancelAnimationFrame(animId); clearTimeout(stop); };
  }, []);
  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-50" />;
}

function ResultModal({ won, current, guesses, onNext }: {
  won: boolean; current: Case;
  guesses: { text: string; correct: boolean; skipped: boolean }[];
  onNext: () => void;
}) {
  const [showTeaching, setShowTeaching] = useState(false);
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)" }}>
      <div className="w-full max-w-lg rounded-2xl p-7 text-center shadow-2xl"
        style={{ background: won ? "#0a3320" : "#2d0a0a", border: `1px solid ${won ? "#22c55e" : "#dc2626"}` }}>
        {won ? (
          <>
            <p className="text-5xl mb-3">🎉</p>
            <p className="text-3xl font-bold mb-1" style={{ color: "#86efac" }}>Patient Saved!</p>
            <p className="text-white text-xl font-semibold mb-1">{current.diagnosis}</p>
            <p className="text-sm mb-4" style={{ color: "#bbf7d0" }}>
              Diagnosed in {guesses.length} guess{guesses.length !== 1 ? "es" : ""}. Outstanding clinical reasoning!
            </p>
          </>
        ) : (
          <>
            <p className="text-5xl mb-3">💀</p>
            <p className="text-3xl font-bold mb-1" style={{ color: "#fca5a5" }}>Patient Lost</p>
            <p className="text-white text-sm mb-1">The diagnosis was:</p>
            <p className="text-white text-2xl font-bold mb-4">{current.diagnosis}</p>
          </>
        )}
        {current.teachingPoints.length > 0 && (
          <div className="mb-4">
            <button
              onClick={() => setShowTeaching(s => !s)}
              className="text-sm font-semibold px-4 py-2 rounded-xl"
              style={{ background: "#0e3d4a", color: "#14b8a6", border: "1px solid #14b8a6" }}
            >
              {showTeaching ? "Hide" : "📚 Show"} Teaching Points
            </button>
            {showTeaching && (
              <div className="mt-3 rounded-xl p-4 text-left space-y-2" style={{ background: "#011a1f" }}>
                {current.teachingPoints.map((pt, i) => (
                  <p key={i} className="text-sm" style={{ color: "#94a3b8" }}>
                    <span style={{ color: "#14b8a6" }}>•</span> {pt}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
        <button onClick={onNext} className="text-white px-10 py-3 rounded-xl font-bold text-lg w-full"
          style={{ background: "#14b8a6" }}>
          Next Case →
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  const [cases, setCases] = useState<Case[]>([]);
  const [current, setCurrent] = useState<Case | null>(null);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [revealed, setRevealed] = useState(1);
  const [guess, setGuess] = useState("");
  const [guesses, setGuesses] = useState<{ text: string; correct: boolean; skipped: boolean }[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showECG, setShowECG] = useState(false);

  const pickNewCase = useCallback((allCases: Case[], seen: Set<string>) => {
    const unseen = allCases.filter(c => !seen.has(c.id));
    const pool = unseen.length > 0 ? unseen : allCases;
    return pool[Math.floor(Math.random() * pool.length)];
  }, []);

  useEffect(() => {
    fetch("/cases.txt")
      .then(r => r.text())
      .then(text => {
        const parsed = parseCases(text);
        setCases(parsed);
        const first = parsed[Math.floor(Math.random() * parsed.length)];
        setCurrent(first);
        setSeenIds(new Set([first.id]));
      });
  }, []);

  const startNextCase = () => {
    const newSeen = new Set(seenIds);
    if (current) newSeen.add(current.id);
    const next = pickNewCase(cases, newSeen);
    setSeenIds(new Set([...newSeen, next.id]));
    setCurrent(next);
    setRevealed(1);
    setGuess("");
    setGuesses([]);
    setGameOver(false);
    setWon(false);
    setShowDropdown(false);
    setShowConfetti(false);
  };

  const allDiagnoses = cases.flatMap(c => [c.diagnosis, ...c.aliases]);
  const filtered = guess.trim().length > 0
    ? allDiagnoses.filter(d => d.toLowerCase().includes(guess.toLowerCase().trim())).slice(0, 6)
    : [];

  const badGuesses = guesses.filter(g => !g.correct).length;
  const guessesLeft = MAX_GUESSES - guesses.length;

  const submitGuess = (text: string, skipped = false) => {
    if (!current || gameOver) return;
    const g = text.trim();
    if (!g && !skipped) return;
    const correct = !skipped && (
      g.toLowerCase() === current.diagnosis.toLowerCase() ||
      current.aliases.some(a => a.toLowerCase() === g.toLowerCase())
    );
    const newGuesses = [...guesses, { text: skipped ? "Skipped" : g, correct, skipped }];
    setGuesses(newGuesses);
    setGuess("");
    setShowDropdown(false);
    if (correct) { setWon(true); setGameOver(true); setShowConfetti(true); return; }
    setRevealed(prev => Math.min(prev + 1, current.clues.length));
    if (newGuesses.length >= MAX_GUESSES) setGameOver(true);
  };

  if (!current) return (
    <main className="min-h-screen flex items-center justify-center" style={{ background: "#022129" }}>
      <p className="text-white text-xl">Loading...</p>
    </main>
  );

  return (
    <main className="min-h-screen flex flex-col items-center px-4 pb-16" style={{ background: "#022129" }}>
      {showConfetti && <Confetti />}
      <Analytics />

      {gameOver && current && (
        <ResultModal won={won} current={current} guesses={guesses} onNext={startNextCase} />
      )}

      <img src="/logo.png" alt="Medicle" className="mt-8 mb-5" style={{ height: "80px" }} />

      {/* Clue progress */}
      <div className="flex items-center gap-2 mb-3 text-sm w-full max-w-3xl" style={{ color: "#6b7280" }}>
        <span className="whitespace-nowrap">Clue {revealed}/{current.clues.length}</span>
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "#0e3d4a" }}>
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${(revealed / current.clues.length) * 100}%`, background: "#14b8a6" }} />
        </div>
        <span className="text-xs font-mono whitespace-nowrap" style={{ color: "#6b7280" }}>
          {guessesLeft} guess{guessesLeft !== 1 ? "es" : ""} left
        </span>
      </div>

      {/* Clue cards */}
      <div className="w-full max-w-3xl space-y-2 mb-4">
        {current.clues.slice(0, revealed).map((clue, i) => (
          <div key={i} className="rounded-xl px-4 py-3 text-sm border-l-4 transition-all duration-300"
            style={{ background: "#0a2f38", borderColor: i === revealed - 1 ? "#14b8a6" : "#0e3d4a", color: "#e2e8f0" }}>
            <span className="text-xs font-mono mr-2" style={{ color: "#2d7a8a" }}>#{i + 1}</span>
            {clue}
          </div>
        ))}
      </div>

      {/* Input */}
      {!gameOver && (
        <div className="relative w-full max-w-3xl mb-2">
          <div className="flex gap-2">
            <input
              className="min-w-0 flex-1 rounded-xl text-white px-3 py-2 outline-none text-sm"
              style={{ background: "#0a2f38", border: "1px solid #0e3d4a", color: "white" }}
              placeholder="Enter diagnosis..."
              value={guess}
              onChange={e => { setGuess(e.target.value); setShowDropdown(true); }}
              onKeyDown={e => e.key === "Enter" && submitGuess(guess)}
              onFocus={() => setShowDropdown(true)}
            />
            <button onClick={() => submitGuess(guess)}
              className="text-white py-2 rounded-xl font-bold text-sm shrink-0"
              style={{ background: "#14b8a6", minWidth: "64px" }}>
              Guess
            </button>
            <button onClick={() => submitGuess("", true)}
              className="text-white py-2 rounded-xl font-bold text-sm shrink-0"
              style={{ background: "#0e3d4a", minWidth: "52px" }}>
              Skip
            </button>
          </div>
          {showDropdown && filtered.length > 0 && (
            <div className="absolute z-10 w-full rounded-xl mt-1 overflow-hidden shadow-lg"
              style={{ background: "#0a2f38", border: "1px solid #0e3d4a" }}>
              {filtered.map((d, i) => (
                <div key={i} className="px-4 py-2 text-white cursor-pointer text-sm"
                  style={{ borderBottom: "1px solid #0e3d4a" }}
                  onMouseDown={() => submitGuess(d)}
                  onMouseOver={e => (e.currentTarget.style.background = "#14b8a6")}
                  onMouseOut={e => (e.currentTarget.style.background = "transparent")}>
                  {d}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Guess history */}
      <div className="mt-2 space-y-1 w-full max-w-3xl">
        {guesses.map((g, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span style={{ color: g.skipped ? "#6b7280" : g.correct ? "#4ade80" : "#f87171" }}>
              {g.skipped ? "—" : g.correct ? "✓" : "✗"}
            </span>
            <span style={{ color: g.skipped ? "#6b7280" : g.correct ? "#4ade80" : "#f87171" }}>{g.text}</span>
          </div>
        ))}
      </div>

      {/* ECG toggle + monitor at bottom */}
      <div className="mt-8 w-full max-w-3xl">
        <button
          onClick={() => setShowECG(s => !s)}
          className="flex items-center gap-2 text-xs font-mono mb-2 px-3 py-1 rounded-lg transition-all"
          style={{
            background: showECG ? "#0a2f38" : "transparent",
            border: "1px solid #0e3d4a",
            color: showECG ? "#14b8a6" : "#2d7a8a"
          }}
        >
          <span style={{ color: showECG ? "#22c55e" : "#2d7a8a" }}>●</span>
          {showECG ? "Hide" : "Show"} Patient Monitor
        </button>
        {showECG && (
          <ECGMonitor badGuesses={badGuesses} gameOver={gameOver} won={won} guessesLeft={guessesLeft} />
        )}
      </div>

      {/* Footer */}
      <div className="mt-8 w-full max-w-3xl text-center space-y-3">
        <p className="text-xs" style={{ color: "#2d7a8a" }}>
          ⚠️ Cases are AI-generated for educational purposes only and may contain inaccuracies. Not for clinical use.
        </p>
        <p className="text-xs" style={{ color: "#1d5a66" }}>
          Medicle is an independent, fan-made endless diagnosis game inspired by{" "}
          <a href="https://doctordle.org" target="_blank" rel="noopener noreferrer" style={{ color: "#14b8a6" }}>Doctordle</a>
          . We love what they built and created this as a complement — not a competitor — so medical students can practice endlessly. All credit to the Doctordle team for the original concept.
        </p>
        <p className="text-xs" style={{ color: "#2d7a8a" }}>
          Questions or feedback?{" "}
          <a href="mailto:medicle.game@gmail.com" style={{ color: "#14b8a6" }}>medicle.game@gmail.com</a>
        </p>
      </div>
    </main>
  );
}