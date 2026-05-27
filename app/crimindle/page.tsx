"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Analytics } from "@vercel/analytics/next";

type Case = {
  id: string;
  diagnosis: string;
  aliases: string[];
  clues: string[];
  teachingPoints: string[];
  difficulty?: string;
  system?: string;
};

type Guess = {
  text: string;
  correct: boolean;
  skipped: boolean;
};

const MAX_GUESSES = 6;
const CASES_PATH = "/crimdle_cases.txt";

const GAVEL_SPEEDS = [3000, 2400, 1800, 1300, 900, 500];
const GAVEL_LABELS = [
  "Case Filed",
  "Discovery Phase",
  "Pre-Trial Motions",
  "Trial Underway",
  "Closing Arguments",
  "Verdict Imminent",
];
const GAVEL_COLORS = [
  "#d4af37",
  "#c9a227",
  "#c0392b",
  "#a93226",
  "#922b21",
  "#7b241c",
];

function normalizeAnswer(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function parseCases(text: string): Case[] {
  const blocks = text
    .split(/\n={10,}\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  const cases: Case[] = [];

  for (const block of blocks) {
    const idMatch = block.match(/CASE_ID:\s*(\d+)/);
    const diagMatch = block.match(/DIAGNOSIS:\s*\n([^\n]+)/);
    const aliasMatch = block.match(/ALIASES:\s*\n([\s\S]*?)(?=\nVIGNETTE_LINES:)/);
    const clueMatch = block.match(/VIGNETTE_LINES:\s*\n([\s\S]*?)(?=\nTEACHING_POINTS:|\nCASE_ID:|$)/);
    const teachMatch = block.match(/TEACHING_POINTS:\s*\n([\s\S]*?)(?=\n={10,}|\nCASE_ID:|$)/);
    const difficultyMatch = block.match(/DIFFICULTY:\s*\n?([^\n]+)/);
    const systemMatch = block.match(/SYSTEM:\s*\n?([^\n]+)/);

    if (!idMatch || !diagMatch || !clueMatch) continue;

    const diagnosis = diagMatch[1].trim();
    const aliases = aliasMatch
      ? aliasMatch[1]
          .split("\n")
          .map((a) => a.replace(/^[-\s]+/, "").trim())
          .filter(Boolean)
      : [];
    const clues = clueMatch[1]
      .split("\n")
      .map((line) => line.replace(/^\d+\.\s*/, "").trim())
      .filter(Boolean);
    const teachingPoints = teachMatch
      ? teachMatch[1]
          .split("\n")
          .map((line) => line.replace(/^[-\s]+/, "").trim())
          .filter(Boolean)
      : [];

    cases.push({
      id: idMatch[1],
      diagnosis,
      aliases,
      clues,
      teachingPoints,
      difficulty: difficultyMatch?.[1].trim(),
      system: systemMatch?.[1].trim(),
    });
  }

  return cases.sort((a, b) => Number(a.id) - Number(b.id));
}

function GavelAnimation({
  badGuesses,
  gameOver,
  won,
}: {
  badGuesses: number;
  gameOver: boolean;
  won: boolean;
}) {
  const [angle, setAngle] = useState(0);
  const [striking, setStriking] = useState(false);
  const animRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idx = won ? 0 : Math.min(badGuesses, GAVEL_SPEEDS.length - 1);
  const speed = GAVEL_SPEEDS[idx];
  const label = won
    ? "Verdict: GUILTY ✓"
    : gameOver && !won
    ? "MISTRIAL — Case Dismissed"
    : GAVEL_LABELS[idx];
  const color = won ? "#d4af37" : gameOver && !won ? "#4a0000" : GAVEL_COLORS[idx];
  const broken = gameOver && !won;

  useEffect(() => {
    if (gameOver) {
      setAngle(won ? -45 : 15);
      return;
    }

    const strike = () => {
      setStriking(true);
      setAngle(-55);
      setTimeout(() => {
        setAngle(15);
        setTimeout(() => {
          setStriking(false);
          setAngle(0);
        }, 120);
      }, 140);
      animRef.current = setTimeout(strike, speed);
    };

    animRef.current = setTimeout(strike, speed);
    return () => {
      if (animRef.current) clearTimeout(animRef.current);
    };
  }, [speed, gameOver, won]);

  return (
    <div
      className="w-full rounded-2xl p-4 border"
      style={{ background: "#0a0500", borderColor: "#3a2a0a" }}
    >
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-xs font-mono tracking-widest" style={{ color }}>
          ⚖ {label}
        </span>
        {!gameOver && (
          <span className="text-xs font-mono" style={{ color: "#8a7340" }}>
            {MAX_GUESSES - badGuesses} guess{MAX_GUESSES - badGuesses !== 1 ? "es" : ""} left
          </span>
        )}
      </div>

      <div className="flex items-center justify-center" style={{ height: "110px" }}>
        <svg
          viewBox="0 0 200 110"
          width="320"
          height="110"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Sound wave rings when striking */}
          {striking && (
            <>
              <ellipse cx="148" cy="90" rx="10" ry="4" fill="none" stroke={color} strokeWidth="1" opacity="0.5" />
              <ellipse cx="148" cy="90" rx="18" ry="7" fill="none" stroke={color} strokeWidth="0.8" opacity="0.3" />
              <ellipse cx="148" cy="90" rx="26" ry="10" fill="none" stroke={color} strokeWidth="0.5" opacity="0.15" />
            </>
          )}

          {/* Sound block base */}
          <rect x="120" y="88" width="56" height="10" rx="2" fill={broken ? "#2a0000" : "#5c3d1e"} />
          <rect x="124" y="85" width="48" height="6" rx="1" fill={broken ? "#1a0000" : "#7a5230"} />

          {/* Gavel group — pivot at handle base */}
          <g
            transform={`rotate(${angle}, 80, 85)`}
            style={{ transition: striking ? "transform 0.14s ease-in" : "transform 0.12s ease-out" }}
          >
            {/* Handle */}
            <rect
              x="76"
              y="30"
              width="8"
              height="58"
              rx="3"
              fill={broken ? "#3a1a1a" : "#8b5e3c"}
            />
            <rect
              x="77"
              y="30"
              width="3"
              height="58"
              rx="2"
              fill={broken ? "#4a2222" : "#a0714f"}
              opacity="0.5"
            />

            {/* Head */}
            <rect
              x="50"
              y="20"
              width="60"
              height="22"
              rx="4"
              fill={broken ? "#2a0000" : color}
            />
            <rect
              x="50"
              y="20"
              width="60"
              height="8"
              rx="4"
              fill={broken ? "#3a0000" : "#e8c84a"}
              opacity="0.3"
            />

            {/* Crack overlay for broken state */}
            {broken && (
              <>
                <line x1="78" y1="20" x2="74" y2="42" stroke="#ff4444" strokeWidth="1.5" opacity="0.7" />
                <line x1="82" y1="20" x2="86" y2="42" stroke="#ff4444" strokeWidth="1" opacity="0.5" />
              </>
            )}
          </g>
        </svg>
      </div>

      {/* Status bar */}
      <div
        className="mt-2 h-1 rounded-full overflow-hidden"
        style={{ background: "#1a1000" }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: won
              ? "100%"
              : broken
              ? "0%"
              : `${((MAX_GUESSES - badGuesses) / MAX_GUESSES) * 100}%`,
            background: color,
          }}
        />
      </div>
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

    const colors = ["#d4af37", "#c0392b", "#e8c84a", "#f5e6a3", "#ffffff", "#922b21", "#f0c040"];
    const pieces = Array.from({ length: 200 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      r: Math.random() * 7 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      tiltAngle: Math.random() * Math.PI * 2,
      tiltSpeed: Math.random() * 0.07 + 0.03,
      speed: Math.random() * 2.5 + 1.5,
    }));

    let animId: number;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach((p) => {
        p.tiltAngle += p.tiltSpeed;
        p.y += p.speed;
        const tilt = Math.sin(p.tiltAngle) * 14;
        ctx.beginPath();
        ctx.lineWidth = p.r;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + tilt + p.r / 2, p.y);
        ctx.lineTo(p.x + tilt, p.y + tilt + p.r / 2);
        ctx.stroke();
        if (p.y > canvas.height) p.y = -10;
      });
      animId = requestAnimationFrame(draw);
    };

    draw();
    const stop = setTimeout(() => cancelAnimationFrame(animId), 5000);
    return () => {
      cancelAnimationFrame(animId);
      clearTimeout(stop);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-50" />;
}

function ShareCard({ shareText }: { shareText: string }) {
  const [copied, setCopied] = useState(false);

  const copyShareText = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // no-op
    }
  };

  return (
    <div
      className="mt-4 rounded-2xl p-4 text-left"
      style={{ background: "#100800", border: "1px solid #3a2a0a" }}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <p
          className="text-xs font-mono uppercase tracking-[0.2em]"
          style={{ color: "#c9a227" }}
        >
          Share result
        </p>
        <button
          onClick={copyShareText}
          className="text-xs font-bold px-3 py-1.5 rounded-lg"
          style={{ background: "#d4af37", color: "#0d0800" }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre
        className="whitespace-pre-wrap text-sm leading-6 font-mono"
        style={{ color: "#e8d5a0" }}
      >
        {shareText}
      </pre>
    </div>
  );
}

function ResultModal({
  won,
  current,
  guesses,
  solvedAtClueCount,
  onNext,
}: {
  won: boolean;
  current: Case;
  guesses: Guess[];
  solvedAtClueCount: number;
  onNext: () => void;
}) {
  const [showTeaching, setShowTeaching] = useState(false);

  const shareText = useMemo(() => {
    if (!won) return "";
    const gold = Math.max(1, Math.min(solvedAtClueCount, MAX_GUESSES));
    const white = Math.max(0, MAX_GUESSES - gold);
    return `CRIMINDLE ⚖️\nVerdicted in ${gold} clue${gold === 1 ? "" : "s"}\n${"🟨".repeat(gold)}${"⬜".repeat(white)}`;
  }, [won, solvedAtClueCount]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.82)" }}
    >
      <div
        className="w-full max-w-lg rounded-2xl p-7 text-center shadow-2xl max-h-[90vh] overflow-y-auto"
        style={{
          background: won ? "#100a00" : "#120000",
          border: `1px solid ${won ? "#d4af37" : "#7b241c"}`,
        }}
      >
        {won ? (
          <>
            <p className="text-5xl mb-3">⚖️</p>
            <p className="text-3xl font-bold mb-1" style={{ color: "#d4af37" }}>
              Verdict: Guilty!
            </p>
            <p className="text-white text-xl font-semibold mb-1">{current.diagnosis}</p>
            <p className="text-sm mb-1" style={{ color: "#e8c84a" }}>
              Charged in {guesses.length} guess{guesses.length !== 1 ? "es" : ""}.
            </p>
            <p className="text-sm mb-4" style={{ color: "#e8c84a" }}>
              Solved at clue {solvedAtClueCount}.
            </p>
            <ShareCard shareText={shareText} />
          </>
        ) : (
          <>
            <p className="text-5xl mb-3">🔨</p>
            <p className="text-3xl font-bold mb-1" style={{ color: "#c0392b" }}>
              Case Dismissed
            </p>
            <p className="text-white text-sm mb-1">The charge was:</p>
            <p className="text-white text-2xl font-bold mb-4">{current.diagnosis}</p>
          </>
        )}

        {current.teachingPoints.length > 0 && (
          <div className="mb-4">
            <button
              onClick={() => setShowTeaching((s) => !s)}
              className="text-sm font-semibold px-4 py-2 rounded-xl"
              style={{
                background: "#1a1000",
                color: "#d4af37",
                border: "1px solid #d4af37",
              }}
            >
              {showTeaching ? "Hide" : "⚖️ Show"} Legal Notes
            </button>
            {showTeaching && (
              <div
                className="mt-3 rounded-xl p-4 text-left space-y-2"
                style={{ background: "#0a0500" }}
              >
                {current.teachingPoints.map((pt, i) => (
                  <p key={i} className="text-sm" style={{ color: "#c9a227" }}>
                    <span style={{ color: "#d4af37" }}>•</span> {pt}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        <button
          onClick={onNext}
          className="text-black px-10 py-3 rounded-xl font-bold text-lg w-full"
          style={{ background: "#d4af37" }}
        >
          Next Case →
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  const [cases, setCases] = useState<Case[]>([]);
  const [current, setCurrent] = useState<Case | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [revealed, setRevealed] = useState(1);
  const [guess, setGuess] = useState("");
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showGavel, setShowGavel] = useState(true);
  const [showSystem, setShowSystem] = useState(false);
  const [solvedAtClueCount, setSolvedAtClueCount] = useState(1);
  const [loadError, setLoadError] = useState("");

  const pickNewCase = useCallback((allCases: Case[], seen: Set<string>) => {
    const unseen = allCases.filter((c) => !seen.has(c.id));
    const pool = unseen.length > 0 ? unseen : allCases;
    return pool[Math.floor(Math.random() * pool.length)];
  }, []);

  const resetRound = useCallback((nextCase: Case) => {
    setCurrent(nextCase);
    setSelectedCaseId(nextCase.id);
    setRevealed(1);
    setGuess("");
    setGuesses([]);
    setGameOver(false);
    setWon(false);
    setShowDropdown(false);
    setShowConfetti(false);
    setShowGavel(true);
    setSolvedAtClueCount(1);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadCases() {
      try {
        const response = await fetch(CASES_PATH);
        if (!response.ok) throw new Error(`Failed to load cases from ${CASES_PATH}`);
        const text = await response.text();
        const parsed = parseCases(text);

        if (!active) return;

        setCases(parsed);

        if (parsed.length === 0) {
          setLoadError("No cases were parsed from the file.");
          return;
        }

        const first = parsed[Math.floor(Math.random() * parsed.length)];
        setCurrent(first);
        setSelectedCaseId(first.id);
        setSeenIds(new Set([first.id]));
      } catch (error) {
        if (!active) return;
        setLoadError(error instanceof Error ? error.message : "Failed to load cases.");
      }
    }

    loadCases();

    return () => {
      active = false;
    };
  }, []);

  const loadCaseById = useCallback(
    (caseId: string) => {
      if (!cases.length) return;
      const nextCase = cases.find((c) => c.id === caseId);
      if (!nextCase) return;
      setSeenIds(new Set([nextCase.id]));
      resetRound(nextCase);
    },
    [cases, resetRound]
  );

  const startNextCase = useCallback(() => {
    if (!cases.length || !current) return;
    const newSeen = new Set(seenIds);
    newSeen.add(current.id);
    const next = pickNewCase(cases, newSeen);
    setSeenIds(new Set([...newSeen, next.id]));
    resetRound(next);
  }, [cases, current, pickNewCase, resetRound, seenIds]);

  const allDiagnoses = useMemo(
    () => cases.flatMap((c) => [c.diagnosis, ...c.aliases]),
    [cases]
  );

  const caseOptions = useMemo(
    () =>
      cases.map((c) => ({
        id: c.id,
        label: showSystem
          ? `Case ${c.id}${c.system ? ` • ${c.system}` : ""}`
          : `Case ${c.id}`,
      })),
    [cases, showSystem]
  );

  const filtered = useMemo(() => {
    const q = guess.trim().toLowerCase();
    if (!q) return [];
    return allDiagnoses.filter((d) => d.toLowerCase().includes(q)).slice(0, 6);
  }, [allDiagnoses, guess]);

  const badGuesses = guesses.filter((g) => !g.correct).length;
  const guessesLeft = MAX_GUESSES - guesses.length;

  const submitGuess = useCallback(
    (text: string, skipped = false) => {
      if (!current || gameOver) return;
      const g = text.trim();
      if (!g && !skipped) return;

      const correct =
        !skipped &&
        [current.diagnosis, ...current.aliases].some(
          (answer) => normalizeAnswer(answer) === normalizeAnswer(g)
        );

      const newGuesses = [...guesses, { text: skipped ? "Skipped" : g, correct, skipped }];
      setGuesses(newGuesses);
      setGuess("");
      setShowDropdown(false);

      if (correct) {
        setWon(true);
        setGameOver(true);
        setShowConfetti(true);
        setSolvedAtClueCount(revealed);
        return;
      }

      setRevealed((prev) => Math.min(prev + 1, current.clues.length));
      if (newGuesses.length >= MAX_GUESSES) setGameOver(true);
    },
    [current, gameOver, guesses, revealed]
  );

  if (loadError) {
    return (
      <main
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: "#0d0800" }}
      >
        <div
          className="max-w-xl rounded-2xl p-6 border"
          style={{ background: "#1a1000", borderColor: "#3a2a0a" }}
        >
          <p className="text-white text-lg font-semibold mb-2">
            Could not load the cases file.
          </p>
          <p className="text-sm" style={{ color: "#c9a227" }}>
            {loadError}
          </p>
          <p className="text-sm mt-3" style={{ color: "#c9a227" }}>
            Put <span className="font-mono">crimdle_cases.txt</span> in your{" "}
            <span className="font-mono">public</span> folder.
          </p>
        </div>
      </main>
    );
  }

  if (!current) {
    return (
      <main
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#0d0800" }}
      >
        <p className="text-white text-xl">Loading...</p>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen flex flex-col items-center px-4 pb-16"
      style={{ background: "#0d0800" }}
    >
      {showConfetti && <Confetti />}
      <Analytics />

      {/* OTHER GAMES DROPDOWN */}
      <div style={{ position: "absolute", top: "16px", left: "16px" }}>
        <select
          onChange={(e) => {
            if (e.target.value === "medicle") window.location.href = "/";
            if (e.target.value === "vettle") window.location.href = "/vettle";
            if (e.target.value === "psychodle") window.location.href = "/psychodle";
            if (e.target.value === "dentdle") window.location.href = "/dentdle";
            if (e.target.value === "crimindle") window.location.href = "/crimindle";
          }}
          defaultValue="crimindle"
          style={{
            background: "#1a1000",
            border: "1px solid #3a2a0a",
            color: "#ffffff",
            borderRadius: "8px",
            padding: "6px 10px",
            fontSize: "12px",
          }}
        >
          <option value="crimindle">⚖️ Crimindle — Criminal Law</option>
          <option value="medicle">🧠 Medicle</option>
          <option value="vettle">🐾 Vettle — Veterinary cases</option>
          <option value="psychodle">🧩 Psychodle — Psychiatry cases</option>
          <option value="dentdle">🦷 Dentdle — Dental cases</option>
        </select>
      </div>

      {gameOver && current && (
        <ResultModal
          won={won}
          current={current}
          guesses={guesses}
          solvedAtClueCount={solvedAtClueCount}
          onNext={startNextCase}
        />
      )}

      {/* HEADER */}
      <div
        style={{
          marginTop: "32px",
          marginBottom: "18px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: "10px",
        }}
      >
        <img src="/crimindle-logo.png" alt="Crimindle" style={{ height: "80px" }} />
        <div
          style={{
            background: "#1a1000",
            border: "1px solid #3a2a0a",
            borderRadius: "16px",
            padding: "16px 20px",
            maxWidth: "720px",
            width: "100%",
          }}
        >
          <p
            style={{
              fontSize: "15px",
              color: "#ffffff",
              fontWeight: "600",
              marginBottom: "6px",
            }}
          >
            Can you identify the crime before the gavel falls?
          </p>
          <p
            style={{
              fontSize: "12px",
              color: "#c9a227",
              marginBottom: "8px",
            }}
          >
            Endless progressive criminal law vignettes. A new case every round.
          </p>
          <a
            href="https://www.medicle.net/crimindle"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: "13px",
              fontWeight: "bold",
              color: "#d4af37",
              textDecoration: "none",
            }}
          >
            🔗 www.medicle.net/crimindle
          </a>
        </div>

        {/* CASE SELECTOR */}
        <div className="w-full max-w-3xl grid gap-3 sm:grid-cols-[1fr_auto] items-center">
          <div className="text-left">
            <label
              className="block text-xs font-mono tracking-widest mb-1"
              style={{ color: "#8a7340" }}
            >
              Jump to case
            </label>
            <select
              value={selectedCaseId}
              onChange={(e) => loadCaseById(e.target.value)}
              className="w-full rounded-xl px-3 py-2 text-sm outline-none"
              style={{
                background: "#1a1000",
                border: "1px solid #3a2a0a",
                color: "white",
              }}
              disabled={!cases.length}
            >
              {caseOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {current && (
            <div className="sm:text-right text-left">
              <p
                className="text-xs font-mono tracking-widest"
                style={{ color: "#8a7340" }}
              >
                CURRENT CASE
              </p>
              <p className="text-lg font-bold" style={{ color: "#e8d5a0" }}>
                #{current.id}
              </p>
              {showSystem && current.system && (
                <p className="text-xs" style={{ color: "#d4af37" }}>
                  {current.system}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CLUE PROGRESS BAR */}
      <div
        className="flex items-center gap-2 mb-3 text-sm w-full max-w-3xl"
        style={{ color: "#8a7340" }}
      >
        <span className="whitespace-nowrap">
          Clue {revealed}/{current.clues.length}
        </span>
        <div
          className="flex-1 h-1.5 rounded-full overflow-hidden"
          style={{ background: "#2a1a00" }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${(revealed / current.clues.length) * 100}%`,
              background: "#d4af37",
            }}
          />
        </div>
        <span
          className="text-xs font-mono whitespace-nowrap"
          style={{ color: "#8a7340" }}
        >
          {guessesLeft} guess{guessesLeft !== 1 ? "es" : ""} left
        </span>
      </div>

      {/* CLUE CARDS */}
      <div className="w-full max-w-3xl space-y-2 mb-4">
        {current.clues.slice(0, revealed).map((clue, i) => (
          <div
            key={i}
            className="rounded-xl px-4 py-3 text-sm border-l-4 transition-all duration-300"
            style={{
              background: "#1a1000",
              borderColor: i === revealed - 1 ? "#d4af37" : "#3a2a0a",
              color: "#e8d5a0",
            }}
          >
            <span
              className="text-xs font-mono mr-2"
              style={{ color: "#8a7340" }}
            >
              #{i + 1}
            </span>
            {clue}
          </div>
        ))}
      </div>

      {/* GUESS INPUT */}
      {!gameOver && (
        <div className="relative w-full max-w-3xl mb-2">
          <div className="flex gap-2">
            <input
              className="min-w-0 flex-1 rounded-xl px-3 py-2 outline-none text-sm"
              style={{
                background: "#1a1000",
                border: "1px solid #3a2a0a",
                color: "white",
              }}
              placeholder="Enter the charge or crime..."
              value={guess}
              onChange={(e) => {
                setGuess(e.target.value);
                setShowDropdown(true);
              }}
              onKeyDown={(e) => e.key === "Enter" && submitGuess(guess)}
              onFocus={() => setShowDropdown(true)}
            />
            <button
              onClick={() => submitGuess(guess)}
              className="py-2 rounded-xl font-bold text-sm shrink-0"
              style={{ background: "#d4af37", color: "#0d0800", minWidth: "64px" }}
            >
              Charge
            </button>
            <button
              onClick={() => submitGuess("", true)}
              className="text-white py-2 rounded-xl font-bold text-sm shrink-0"
              style={{ background: "#3a2a0a", minWidth: "52px" }}
            >
              Skip
            </button>
          </div>

          {showDropdown && filtered.length > 0 && (
            <div
              className="absolute z-10 w-full rounded-xl mt-1 overflow-hidden shadow-lg"
              style={{ background: "#1a1000", border: "1px solid #3a2a0a" }}
            >
              {filtered.map((d, i) => (
                <div
                  key={i}
                  className="px-4 py-2 text-white cursor-pointer text-sm"
                  style={{ borderBottom: "1px solid #3a2a0a" }}
                  onMouseDown={() => submitGuess(d)}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.background = "#d4af37")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  {d}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* GUESS HISTORY */}
      <div className="mt-2 space-y-1 w-full max-w-3xl">
        {guesses.map((g, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span
              style={{
                color: g.skipped
                  ? "#8a7340"
                  : g.correct
                  ? "#d4af37"
                  : "#c0392b",
              }}
            >
              {g.skipped ? "—" : g.correct ? "✓" : "✗"}
            </span>
            <span
              style={{
                color: g.skipped
                  ? "#8a7340"
                  : g.correct
                  ? "#d4af37"
                  : "#c0392b",
              }}
            >
              {g.text}
            </span>
          </div>
        ))}
      </div>

      {/* GAVEL MONITOR */}
      <div className="mt-8 w-full max-w-3xl">
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => setShowGavel((s) => !s)}
            className="flex items-center gap-2 text-xs font-mono mb-2 px-3 py-1 rounded-lg transition-all"
            style={{
              background: showGavel ? "#1a1000" : "transparent",
              border: "1px solid #3a2a0a",
              color: showGavel ? "#d4af37" : "#8a7340",
            }}
          >
            <span style={{ color: showGavel ? "#d4af37" : "#8a7340" }}>●</span>
            {showGavel ? "Hide" : "Show"} Courtroom Status
          </button>
          <button
            onClick={() => setShowSystem((s) => !s)}
            className="flex items-center gap-2 text-xs font-mono mb-2 px-3 py-1 rounded-lg transition-all"
            style={{
              background: showSystem ? "#1a1000" : "transparent",
              border: "1px solid #3a2a0a",
              color: showSystem ? "#d4af37" : "#8a7340",
            }}
          >
            <span style={{ color: showSystem ? "#d4af37" : "#8a7340" }}>●</span>
            {showSystem ? "Hide" : "Show"} Area of Law
          </button>
        </div>

        {showGavel && (
          <GavelAnimation
            badGuesses={badGuesses}
            gameOver={gameOver}
            won={won}
          />
        )}
      </div>

      {/* FOOTER */}
      <div className="mt-8 w-full max-w-3xl text-center space-y-3">
        <p className="text-xs" style={{ color: "#8a7340" }}>
          ⚠️ Cases are AI-generated for educational purposes only and may contain inaccuracies. Not for legal advice or professional use.
        </p>
        <p className="text-xs" style={{ color: "#3a2a0a" }}>
          Crimindle is part of the Medicle family of educational games, inspired by{" "}
          <a
            href="https://doctordle.org"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#d4af37" }}
          >
            Doctordle
          </a>
          . Built for students to practice endlessly.
        </p>
        <p className="text-xs" style={{ color: "#8a7340" }}>
          Questions or feedback?{" "}
          <a href="mailto:medicle.game@gmail.com" style={{ color: "#d4af37" }}>
            medicle.game@gmail.com
          </a>
        </p>
      </div>
    </main>
  );
}
