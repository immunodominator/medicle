"use client";
import { useState, useEffect, useCallback } from "react";

type Case = {
  id: string;
  diagnosis: string;
  aliases: string[];
  clues: string[];
};

function parseCases(text: string): Case[] {
  const cases: Case[] = [];
  const blocks = text.split(/\nCASE_ID:/).filter(Boolean);
  for (const block of blocks) {
    const idMatch = block.match(/^[\s\S]*?(\d+)/);
    const diagMatch = block.match(/DIAGNOSIS:\s*\n([^\n]+)/);
    const aliasMatch = block.match(/ALIASES:\s*\n([\s\S]*?)(?=\nVIGNETTE_LINES:)/);
    const clueMatch = block.match(/VIGNETTE_LINES:\s*\n([\s\S]*?)(?=\nTEACHING_POINTS:|\nCASE_ID:|$)/);
    if (!diagMatch || !clueMatch) continue;
    const diagnosis = diagMatch[1].trim();
    const aliases = aliasMatch
      ? aliasMatch[1].split("\n").map(a => a.replace(/^[-\s]+/, "").trim()).filter(Boolean)
      : [];
    const clues = clueMatch[1]
      .split("\n")
      .map(l => l.replace(/^\d+\.\s*/, "").trim())
      .filter(Boolean);
    cases.push({ id: idMatch?.[1] || "0", diagnosis, aliases, clues });
  }
  return cases;
}

const MAX_GUESSES = 6;

const ECG_PATHS = [
  "M0,50 L20,50 L22,46 L24,54 L26,10 L28,90 L30,44 L32,50 L60,50 L62,46 L64,54 L66,10 L68,90 L70,44 L72,50 L100,50 L102,46 L104,54 L106,10 L108,90 L110,44 L112,50 L140,50 L142,46 L144,54 L146,10 L148,90 L150,44 L152,50 L180,50 L182,46 L184,54 L186,10 L188,90 L190,44 L192,50 L220,50 L222,46 L224,54 L226,10 L228,90 L230,44 L232,50 L260,50 L262,46 L264,54 L266,10 L268,90 L270,44 L272,50 L300,50",
  "M0,50 L15,50 L17,45 L19,55 L21,8 L23,92 L25,43 L27,50 L47,50 L49,45 L51,55 L53,8 L55,92 L57,43 L59,50 L79,50 L81,45 L83,55 L85,8 L87,92 L89,43 L91,50 L111,50 L113,45 L115,55 L117,8 L119,92 L121,43 L123,50 L143,50 L145,45 L147,55 L149,8 L151,92 L153,43 L155,50 L175,50 L177,45 L179,55 L181,8 L183,92 L185,43 L187,50 L207,50 L209,45 L211,55 L213,8 L215,92 L217,43 L219,50 L239,50 L241,45 L243,55 L245,8 L247,92 L249,43 L251,50 L271,50 L273,45 L275,55 L277,8 L279,92 L281,43 L283,50 L300,50",
  "M0,50 L12,50 L14,44 L16,56 L18,6 L20,94 L22,42 L24,50 L38,50 L40,56 L42,44 L44,50 L56,50 L58,44 L60,56 L62,6 L64,94 L66,42 L68,50 L82,50 L84,56 L86,44 L88,50 L100,50 L102,44 L104,56 L106,6 L108,94 L110,42 L112,50 L126,50 L128,56 L130,44 L132,50 L144,50 L146,44 L148,56 L150,6 L152,94 L154,42 L156,50 L170,50 L172,56 L174,44 L176,50 L188,50 L190,44 L192,56 L194,6 L196,94 L198,42 L200,50 L214,50 L216,56 L218,44 L220,50 L232,50 L234,44 L236,56 L238,6 L240,94 L242,42 L244,50 L258,50 L260,56 L262,44 L264,50 L276,50 L278,44 L280,56 L282,6 L284,94 L286,42 L288,50 L300,50",
  "M0,50 L25,50 L27,58 L29,42 L31,5 L33,95 L35,58 L37,42 L39,50 L75,50 L77,58 L79,42 L81,5 L83,95 L85,58 L87,42 L89,50 L125,50 L127,58 L129,42 L131,5 L133,95 L135,58 L137,42 L139,50 L175,50 L177,58 L179,42 L181,5 L183,95 L185,58 L187,42 L189,50 L225,50 L227,58 L229,42 L231,5 L233,95 L235,58 L237,42 L239,50 L275,50 L277,58 L279,42 L281,5 L283,95 L285,58 L287,42 L289,50 L300,50",
  "M0,50 L4,28 L8,72 L12,18 L16,82 L20,35 L24,65 L28,22 L32,78 L36,40 L40,60 L44,25 L48,75 L52,32 L56,68 L60,18 L64,82 L68,38 L72,62 L76,28 L80,72 L84,42 L88,58 L92,22 L96,78 L100,35 L104,65 L108,20 L112,80 L116,38 L120,62 L124,28 L128,72 L132,42 L136,58 L140,22 L144,78 L148,35 L152,65 L156,18 L160,82 L164,38 L168,62 L172,28 L176,72 L180,42 L184,58 L188,22 L192,78 L196,35 L200,65 L204,20 L208,80 L212,38 L216,62 L220,28 L224,72 L228,42 L232,58 L236,22 L240,78 L244,35 L248,65 L252,18 L256,82 L260,38 L264,62 L268,28 L272,72 L276,42 L280,58 L284,22 L288,78 L292,35 L296,65 L300,50",
  "M0,50 L2,42 L4,63 L6,35 L8,70 L10,28 L12,58 L14,44 L16,67 L18,30 L20,55 L22,40 L24,68 L26,25 L28,72 L30,38 L32,56 L34,46 L36,65 L38,29 L40,60 L42,43 L44,70 L46,26 L48,55 L50,40 L52,68 L54,32 L56,58 L58,45 L60,71 L62,28 L64,53 L66,41 L68,66 L70,27 L72,60 L74,43 L76,70 L78,30 L80,55 L82,39 L84,68 L86,24 L88,72 L90,37 L92,56 L94,46 L96,63 L98,28 L100,58 L102,42 L104,67 L106,27 L108,55 L110,40 L112,70 L114,31 L116,57 L118,44 L120,71 L122,28 L124,53 L126,41 L128,65 L130,26 L132,60 L134,43 L136,68 L138,30 L140,55 L142,39 L144,70 L146,24 L148,72 L150,37 L152,56 L154,46 L156,62 L158,28 L160,58 L162,42 L164,67 L166,27 L168,55 L170,40 L172,70 L174,31 L176,57 L178,44 L180,71 L182,28 L184,53 L186,41 L188,65 L190,26 L192,60 L194,43 L196,68 L198,30 L200,55 L202,39 L204,70 L206,24 L208,72 L210,37 L212,56 L214,46 L216,63 L218,28 L220,58 L222,42 L224,67 L226,27 L228,55 L230,40 L232,70 L234,31 L236,57 L238,44 L240,71 L242,28 L244,53 L246,41 L248,65 L250,26 L252,60 L254,43 L256,68 L258,30 L260,55 L262,39 L264,70 L266,24 L268,72 L270,37 L272,56 L274,46 L276,62 L278,28 L280,58 L282,42 L284,67 L286,27 L288,55 L290,40 L292,70 L294,31 L296,57 L298,44 L300,50",
];

const ECG_COLORS = ["#22c55e", "#84cc16", "#facc15", "#f97316", "#ef4444", "#dc2626"];
const ECG_SPEEDS = ["1.8s", "1.4s", "1.1s", "1.5s", "0.7s", "0.5s"];
const ECG_LABELS = ["Stable", "Ill-Appearing", "Distressed", "Obtunded", "Critical", "Peri-Arrest"];

function ECGMonitor({ wrongGuesses, gameOver, won, guessesLeft }: {
  wrongGuesses: number;
  gameOver: boolean;
  won: boolean;
  guessesLeft: number;
}) {
  const idx = Math.min(wrongGuesses, ECG_PATHS.length - 1);
  const flatlined = gameOver && !won;
  const path = flatlined ? "M0,50 L300,50" : ECG_PATHS[idx];
  const color = flatlined ? "#dc2626" : ECG_COLORS[idx];
  const speed = ECG_SPEEDS[idx];
  const label = flatlined ? "FLATLINE" : ECG_LABELS[idx];

  return (
    <div className="w-full max-w-xl mb-4 rounded-2xl p-3 border" style={{ background: "#011a1f", borderColor: "#0e3d4a" }}>
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-xs font-mono tracking-widest" style={{ color }}>
          ● {label}
        </span>
        {!gameOver && (
          <span className="text-xs font-mono" style={{ color: "#6b7280" }}>
            {guessesLeft} guess{guessesLeft !== 1 ? "es" : ""} left
          </span>
        )}
      </div>
      <svg viewBox="0 0 300 100" className="w-full h-20" style={{ background: "#050a0e", borderRadius: "10px" }}>
        {[25, 50, 75].map(y => (
          <line key={y} x1="0" y1={y} x2="300" y2={y} stroke="#0d1f2d" strokeWidth="0.5" />
        ))}
        {[60, 120, 180, 240].map(x => (
          <line key={x} x1={x} y1="0" x2={x} y2="100" stroke="#0d1f2d" strokeWidth="0.5" />
        ))}
        <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d={path} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity="0.12" />
        {!flatlined && (
          <circle r="3" fill={color} opacity="0.9">
            <animateMotion dur={speed} repeatCount="indefinite" path={path} />
          </circle>
        )}
      </svg>
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
  const [gamesPlayed, setGamesPlayed] = useState(0);

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
    setGamesPlayed(g => g + 1);
  };

  const allDiagnoses = cases.flatMap(c => [c.diagnosis, ...c.aliases]);
  const filtered = guess.trim().length > 0
    ? allDiagnoses.filter(d => d.toLowerCase().includes(guess.toLowerCase().trim())).slice(0, 6)
    : [];

  const wrongGuesses = guesses.filter(g => !g.correct && !g.skipped).length;
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

    if (correct) {
      setWon(true);
      setGameOver(true);
      return;
    }

    setRevealed(prev => Math.min(prev + 1, current.clues.length));
    if (newGuesses.length >= MAX_GUESSES) setGameOver(true);
  };

  if (!current) return (
    <main className="min-h-screen flex items-center justify-center" style={{ background: "#022129" }}>
      <p className="text-white text-xl">Loading...</p>
    </main>
  );

  return (
    <main className="min-h-screen flex flex-col items-center p-6 pb-16" style={{ background: "#022129" }}>

      <img src="/logo.png" alt="Medicle" className="mt-8 mb-6" style={{ height: "52px" }} />

      <ECGMonitor
        wrongGuesses={wrongGuesses}
        gameOver={gameOver}
        won={won}
        guessesLeft={guessesLeft}
      />

      <div className="flex items-center gap-2 mb-3 text-sm w-full max-w-xl" style={{ color: "#6b7280" }}>
        <span>Clue {revealed}/{current.clues.length}</span>
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "#0e3d4a" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${(revealed / current.clues.length) * 100}%`, background: "#14b8a6" }}
          />
        </div>
      </div>

      <div className="w-full max-w-xl space-y-2 mb-4">
        {current.clues.slice(0, revealed).map((clue, i) => (
          <div
            key={i}
            className="rounded-xl px-5 py-3 text-sm border-l-4 transition-all duration-300"
            style={{
              background: "#0a2f38",
              borderColor: i === revealed - 1 ? "#14b8a6" : "#0e3d4a",
              color: "#e2e8f0"
            }}
          >
            <span className="text-xs font-mono mr-2" style={{ color: "#2d7a8a" }}>#{i + 1}</span>
            {clue}
          </div>
        ))}
      </div>

      {gameOver ? (
        <div
          className="w-full max-w-xl rounded-2xl p-6 text-center mt-2"
          style={{ background: won ? "#0f3d1f" : "#3d0f0f" }}
        >
          {won ? (
            <>
              <p className="text-4xl mb-2">🎉</p>
              <p className="text-2xl font-bold mb-1" style={{ color: "#86efac" }}>Correct!</p>
              <p className="text-white text-lg font-semibold mb-1">{current.diagnosis}</p>
              <p className="text-sm mb-4" style={{ color: "#bbf7d0" }}>
                You got it in {guesses.length} guess{guesses.length !== 1 ? "es" : ""}.
              </p>
            </>
          ) : (
            <>
              <p className="text-4xl mb-2">💀</p>
              <p className="text-2xl font-bold mb-1" style={{ color: "#fca5a5" }}>Patient Lost</p>
              <p className="text-white text-sm mb-1">The diagnosis was:</p>
              <p className="text-white text-xl font-bold mb-4">{current.diagnosis}</p>
            </>
          )}
          <button
            onClick={startNextCase}
            className="text-white px-8 py-3 rounded-xl font-bold text-lg"
            style={{ background: "#14b8a6" }}
          >
            Next Case →
          </button>
        </div>
      ) : (
        <div className="relative w-full max-w-xl mb-2">
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-xl text-white px-4 py-2 outline-none"
              style={{ background: "#0a2f38", border: "1px solid #0e3d4a", color: "white" }}
              placeholder="Enter diagnosis..."
              value={guess}
              onChange={e => { setGuess(e.target.value); setShowDropdown(true); }}
              onKeyDown={e => e.key === "Enter" && submitGuess(guess)}
              onFocus={() => setShowDropdown(true)}
            />
            <button
              onClick={() => submitGuess(guess)}
              className="text-white px-4 py-2 rounded-xl font-bold"
              style={{ background: "#14b8a6" }}
            >
              Guess
            </button>
            <button
              onClick={() => submitGuess("", true)}
              className="text-white px-4 py-2 rounded-xl font-bold"
              style={{ background: "#0e3d4a" }}
            >
              Skip
            </button>
          </div>
          {showDropdown && filtered.length > 0 && (
            <div
              className="absolute z-10 w-full rounded-xl mt-1 overflow-hidden shadow-lg"
              style={{ background: "#0a2f38", border: "1px solid #0e3d4a" }}
            >
              {filtered.map((d, i) => (
                <div
                  key={i}
                  className="px-4 py-2 text-white cursor-pointer"
                  style={{ borderBottom: "1px solid #0e3d4a" }}
                  onMouseDown={() => submitGuess(d)}
                  onMouseOver={e => (e.currentTarget.style.background = "#14b8a6")}
                  onMouseOut={e => (e.currentTarget.style.background = "transparent")}
                >
                  {d}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-3 space-y-1 w-full max-w-xl">
        {guesses.map((g, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span style={{ color: g.skipped ? "#6b7280" : g.correct ? "#4ade80" : "#f87171" }}>
              {g.skipped ? "—" : g.correct ? "✓" : "✗"}
            </span>
            <span style={{ color: g.skipped ? "#6b7280" : g.correct ? "#4ade80" : "#f87171" }}>
              {g.text}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-12 w-full max-w-xl text-center space-y-3">
        <p className="text-xs" style={{ color: "#2d7a8a" }}>
          ⚠️ Cases are AI-generated for educational purposes only and may contain inaccuracies. Not for clinical use.
        </p>
        <p className="text-xs" style={{ color: "#1d5a66" }}>
          Medicle is an independent, fan-made endless diagnosis game inspired by{" "}
          <a href="https://doctordle.org" target="_blank" rel="noopener noreferrer" style={{ color: "#14b8a6" }}>
            Doctordle
          </a>
          . We love what they built and created this as a complement — not a competitor — so medical students can practice endlessly. All credit to the Doctordle team for the original concept.
        </p>
        <p className="text-xs" style={{ color: "#2d7a8a" }}>
          Questions or feedback?{" "}
          <a href="mailto:medle.game@gmail.com" style={{ color: "#14b8a6" }}>
            medle.game@gmail.com
          </a>
        </p>
      </div>

    </main>
  );
}