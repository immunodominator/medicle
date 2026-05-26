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
  // 0 wrong - normal sinus rhythm
  "M0,50 L15,50 L17,47 L19,53 L21,15 L23,85 L25,45 L27,50 L42,50 L44,47 L46,53 L48,15 L50,85 L52,45 L54,50 L69,50 L71,47 L73,53 L75,15 L77,85 L79,45 L81,50 L96,50 L98,47 L100,53 L102,15 L104,85 L106,45 L108,50 L123,50 L125,47 L127,53 L129,15 L131,85 L133,45 L135,50 L150,50 L152,47 L154,53 L156,15 L158,85 L160,45 L162,50 L177,50 L179,47 L181,53 L183,15 L185,85 L187,45 L189,50 L200,50",
  // 1 wrong - mild tachycardia
  "M0,50 L12,50 L14,46 L16,54 L18,12 L20,88 L22,44 L24,50 L36,50 L38,46 L40,54 L42,12 L44,88 L46,44 L48,50 L60,50 L62,46 L64,54 L66,12 L68,88 L70,44 L72,50 L84,50 L86,46 L88,54 L90,12 L92,88 L94,44 L96,50 L108,50 L110,46 L112,54 L114,12 L116,88 L118,44 L120,50 L132,50 L134,46 L136,54 L138,12 L140,88 L142,44 L144,50 L156,50 L158,46 L160,54 L162,12 L164,88 L166,44 L168,50 L180,50 L182,46 L184,54 L186,12 L188,88 L190,44 L192,50 L200,50",
  // 2 wrong - tachycardia with ST changes
  "M0,50 L9,50 L11,45 L13,55 L15,10 L17,90 L19,43 L21,50 L30,50 L32,55 L34,45 L36,50 L45,50 L47,45 L49,55 L51,10 L53,90 L55,43 L57,50 L66,50 L68,45 L70,55 L72,10 L74,90 L76,43 L78,50 L87,50 L89,55 L91,45 L93,50 L102,50 L104,45 L106,55 L108,10 L110,90 L112,43 L114,50 L123,50 L125,45 L127,55 L129,10 L131,90 L133,43 L135,50 L144,50 L146,55 L148,45 L150,50 L159,50 L161,45 L163,55 L165,10 L167,90 L169,43 L171,50 L180,50 L182,55 L184,45 L186,50 L195,50 L197,45 L199,55 L200,50",
  // 3 wrong - wide complex, bradycardia
  "M0,50 L18,50 L20,58 L22,42 L24,8 L26,92 L28,58 L30,42 L32,50 L50,50 L52,58 L54,42 L56,8 L58,92 L60,58 L62,42 L64,50 L82,50 L84,58 L86,42 L88,8 L90,92 L92,58 L94,42 L96,50 L114,50 L116,58 L118,42 L120,8 L122,92 L124,58 L126,42 L128,50 L146,50 L148,58 L150,42 L152,8 L154,92 L156,58 L158,42 L160,50 L178,50 L180,58 L182,42 L184,8 L186,92 L188,58 L190,42 L192,50 L200,50",
  // 4 wrong - v-tach chaotic
  "M0,50 L3,32 L6,68 L9,22 L12,78 L15,38 L18,62 L21,28 L24,72 L27,42 L30,58 L33,25 L36,75 L39,35 L42,65 L45,20 L48,80 L51,40 L54,60 L57,30 L60,70 L63,45 L66,55 L69,25 L72,75 L75,38 L78,62 L81,22 L84,78 L87,42 L90,58 L93,28 L96,72 L99,35 L102,65 L105,20 L108,80 L111,40 L114,60 L117,32 L120,68 L123,25 L126,75 L129,38 L132,62 L135,22 L138,78 L141,42 L144,58 L147,28 L150,72 L153,35 L156,65 L159,20 L162,80 L165,40 L168,60 L171,30 L174,70 L177,45 L180,55 L183,25 L186,75 L189,38 L192,62 L195,28 L198,72 L200,50",
  // 5 wrong - v-fib
  "M0,50 L2,44 L4,61 L6,37 L8,68 L10,30 L12,57 L14,43 L16,65 L18,33 L20,54 L22,41 L24,67 L26,28 L28,71 L30,39 L32,55 L34,47 L36,63 L38,31 L40,59 L42,44 L44,69 L46,27 L48,54 L50,41 L52,66 L54,34 L56,57 L58,46 L60,70 L62,29 L64,53 L66,42 L68,64 L70,27 L72,59 L74,44 L76,69 L78,31 L80,54 L82,39 L84,67 L86,24 L88,71 L90,37 L92,55 L94,47 L96,62 L98,29 L100,57 L102,43 L104,66 L106,27 L108,54 L110,41 L112,69 L114,32 L116,57 L118,46 L120,71 L122,29 L124,52 L126,42 L128,64 L130,27 L132,59 L134,44 L136,67 L138,31 L140,54 L142,39 L144,69 L146,24 L148,71 L150,37 L152,55 L154,46 L156,62 L158,29 L160,57 L162,43 L164,66 L166,27 L168,53 L170,41 L172,67 L174,32 L176,57 L178,46 L180,71 L182,29 L184,54 L186,42 L188,64 L190,27 L192,59 L194,44 L196,69 L198,34 L200,50",
];

const ECG_COLORS = ["#22c55e", "#86efac", "#facc15", "#f97316", "#ef4444", "#dc2626"];
const ECG_SPEEDS = ["1.6s", "1.3s", "1.0s", "1.4s", "0.6s", "0.5s"];
const ECG_LABELS = ["Normal Sinus", "Tachycardia", "ST Changes", "Bradycardia", "V-Tach", "V-Fib"];

function ECGMonitor({ wrongGuesses, gameOver, won, guessesLeft }: {
  wrongGuesses: number;
  gameOver: boolean;
  won: boolean;
  guessesLeft: number;
}) {
  const idx = Math.min(wrongGuesses, ECG_PATHS.length - 1);
  const flatlined = gameOver && !won;
  const path = flatlined ? "M0,50 L200,50" : ECG_PATHS[idx];
  const color = flatlined ? "#ef4444" : ECG_COLORS[idx];
  const speed = ECG_SPEEDS[idx];
  const label = flatlined ? "FLATLINE" : ECG_LABELS[idx];

  return (
    <div className="w-full max-w-xl mb-4 bg-slate-950 rounded-2xl p-3 border border-slate-800">
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-xs font-mono tracking-widest" style={{ color }}>
          ● {label}
        </span>
        {!gameOver && (
          <span className="text-xs font-mono text-slate-400">
            {guessesLeft} guess{guessesLeft !== 1 ? "es" : ""} left
          </span>
        )}
      </div>
      <svg viewBox="0 0 200 100" className="w-full h-16" style={{ background: "#050a0e", borderRadius: "10px" }}>
        {/* Grid */}
        {[25, 50, 75].map(y => (
          <line key={y} x1="0" y1={y} x2="200" y2={y} stroke="#0d1f2d" strokeWidth="0.5" />
        ))}
        {[40, 80, 120, 160].map(x => (
          <line key={x} x1={x} y1="0" x2={x} y2="100" stroke="#0d1f2d" strokeWidth="0.5" />
        ))}
        {/* ECG line */}
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Glow effect */}
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.15"
        />
        {/* Moving dot */}
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
    <main className="min-h-screen bg-slate-900 flex items-center justify-center">
      <p className="text-white text-xl">Loading...</p>
    </main>
  );

  return (
    <main className="min-h-screen bg-slate-900 flex flex-col items-center p-6 pb-16">

      <h1 className="text-3xl font-bold text-white mt-8 mb-1">Medicle</h1>
      <p className="text-teal-400 mb-4">What&apos;s the Diagnosis?</p>

      <ECGMonitor
        wrongGuesses={wrongGuesses}
        gameOver={gameOver}
        won={won}
        guessesLeft={guessesLeft}
      />

      {/* Clue progress */}
      <div className="flex items-center gap-2 mb-3 text-sm text-slate-400 self-start max-w-xl w-full">
        <span>Clue {revealed}/{current.clues.length}</span>
        <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-teal-500 rounded-full transition-all duration-500"
            style={{ width: `${(revealed / current.clues.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Clue cards */}
      <div className="max-w-xl w-full space-y-2 mb-4">
        {current.clues.slice(0, revealed).map((clue, i) => (
          <div
            key={i}
            className="bg-slate-800 rounded-xl px-5 py-3 text-gray-200 text-sm border-l-4 transition-all duration-300"
            style={{ borderColor: i === revealed - 1 ? "#14b8a6" : "#334155" }}
          >
            <span className="text-slate-500 text-xs font-mono mr-2">#{i + 1}</span>
            {clue}
          </div>
        ))}
      </div>

      {/* End screen */}
      {gameOver ? (
        <div
          className="max-w-xl w-full rounded-2xl p-6 text-center mt-2"
          style={{ background: won ? "rgb(20,83,45)" : "rgb(127,29,29)" }}
        >
          {won ? (
            <>
              <p className="text-4xl mb-2">🎉</p>
              <p className="text-green-300 text-2xl font-bold mb-1">Correct!</p>
              <p className="text-white text-lg font-semibold mb-1">{current.diagnosis}</p>
              <p className="text-green-200 text-sm mb-4">
                You got it in {guesses.length} guess{guesses.length !== 1 ? "es" : ""}.
              </p>
            </>
          ) : (
            <>
              <p className="text-4xl mb-2">💀</p>
              <p className="text-red-300 text-2xl font-bold mb-1">Patient Lost</p>
              <p className="text-white text-sm mb-1">The diagnosis was:</p>
              <p className="text-white text-xl font-bold mb-4">{current.diagnosis}</p>
            </>
          )}
          <button
            onClick={startNextCase}
            className="bg-teal-500 hover:bg-teal-400 text-white px-8 py-3 rounded-xl font-bold text-lg transition-colors"
          >
            Next Case →
          </button>
        </div>
      ) : (
        <div className="relative max-w-xl w-full mb-2">
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-xl bg-slate-700 text-white px-4 py-2 outline-none placeholder-slate-400"
              placeholder="Enter diagnosis..."
              value={guess}
              onChange={e => { setGuess(e.target.value); setShowDropdown(true); }}
              onKeyDown={e => e.key === "Enter" && submitGuess(guess)}
              onFocus={() => setShowDropdown(true)}
            />
            <button
              onClick={() => submitGuess(guess)}
              className="bg-teal-500 hover:bg-teal-400 text-white px-4 py-2 rounded-xl font-bold transition-colors"
            >
              Guess
            </button>
            <button
              onClick={() => submitGuess("", true)}
              className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded-xl font-bold transition-colors"
            >
              Skip
            </button>
          </div>
          {showDropdown && filtered.length > 0 && (
            <div className="absolute z-10 w-full bg-slate-700 rounded-xl mt-1 overflow-hidden shadow-lg">
              {filtered.map((d, i) => (
                <div
                  key={i}
                  className="px-4 py-2 text-white hover:bg-teal-600 cursor-pointer"
                  onMouseDown={() => submitGuess(d)}
                >
                  {d}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Guess history */}
      <div className="mt-3 space-y-1 max-w-xl w-full">
        {guesses.map((g, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className={g.skipped ? "text-slate-400" : g.correct ? "text-green-400" : "text-red-400"}>
              {g.skipped ? "—" : g.correct ? "✓" : "✗"}
            </span>
            <span className={g.skipped ? "text-slate-400" : g.correct ? "text-green-400" : "text-red-400"}>
              {g.text}
            </span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-12 max-w-xl w-full text-center space-y-3">
        <p className="text-slate-500 text-xs">
          ⚠️ Cases are AI-generated for educational purposes only and may contain inaccuracies. Not for clinical use.
        </p>
        <p className="text-slate-600 text-xs">
          Medicle is an independent, fan-made endless diagnosis game inspired by{" "}
          <a href="https://doctordle.org" target="_blank" rel="noopener noreferrer" className="text-teal-700 hover:text-teal-500 underline">
            Doctordle
          </a>
          . We love what they built and created this as a complement — not a competitor — so medical students can practice endlessly. All credit to the Doctordle team for the original concept.
        </p>
        <p className="text-slate-500 text-xs">
          Questions or feedback?{" "}
          <a href="mailto:medle.game@gmail.com" className="text-teal-600 hover:text-teal-400 underline">
            medle.game@gmail.com
          </a>
        </p>
      </div>

    </main>
  );
}