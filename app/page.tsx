"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Analytics } from "@vercel/analytics/next";

// =============================================================
// TYPES
// =============================================================

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

// =============================================================
// CONFIG
// =============================================================

const MAX_GUESSES = 6;

// ✅ Your cases file in /public
// If you rename it, update this string.
const CASES_PATH = "/cases_master_250.txt";

// ✅ Optional: add a much larger Step 1 answer bank in /public
// Format: one diagnosis per line.
// This makes the dropdown harder (more realistic).
const DIAGNOSIS_BANK_PATH = "/step1_diagnosis_bank.txt";

// =============================================================
// ECG DISPLAY (unchanged gameplay flair)
// =============================================================

const ECG_POINTS: [number, number][][] = [
  [
    [0, 50],
    [20, 50],
    [22, 46],
    [24, 54],
    [26, 10],
    [28, 90],
    [30, 44],
    [32, 50],
    [60, 50],
    [62, 46],
    [64, 54],
    [66, 10],
    [68, 90],
    [70, 44],
    [72, 50],
    [100, 50],
    [102, 46],
    [104, 54],
    [106, 10],
    [108, 90],
    [110, 44],
    [112, 50],
    [140, 50],
    [142, 46],
    [144, 54],
    [146, 10],
    [148, 90],
    [150, 44],
    [152, 50],
    [180, 50],
    [182, 46],
    [184, 54],
    [186, 10],
    [188, 90],
    [190, 44],
    [192, 50],
    [220, 50],
    [222, 46],
    [224, 54],
    [226, 10],
    [228, 90],
    [230, 44],
    [232, 50],
    [260, 50],
    [262, 46],
    [264, 54],
    [266, 10],
    [268, 90],
    [270, 44],
    [272, 50],
    [300, 50],
  ],
  [
    [0, 50],
    [15, 50],
    [17, 45],
    [19, 55],
    [21, 8],
    [23, 92],
    [25, 43],
    [27, 50],
    [47, 50],
    [49, 45],
    [51, 55],
    [53, 8],
    [55, 92],
    [57, 43],
    [59, 50],
    [79, 50],
    [81, 45],
    [83, 55],
    [85, 8],
    [87, 92],
    [89, 43],
    [91, 50],
    [111, 50],
    [113, 45],
    [115, 55],
    [117, 8],
    [119, 92],
    [121, 43],
    [123, 50],
    [143, 50],
    [145, 45],
    [147, 55],
    [149, 8],
    [151, 92],
    [153, 43],
    [155, 50],
    [175, 50],
    [177, 45],
    [179, 55],
    [181, 8],
    [183, 92],
    [185, 43],
    [187, 50],
    [207, 50],
    [209, 45],
    [211, 55],
    [213, 8],
    [215, 92],
    [217, 43],
    [219, 50],
    [239, 50],
    [241, 45],
    [243, 55],
    [245, 8],
    [247, 92],
    [249, 43],
    [251, 50],
    [271, 50],
    [273, 45],
    [275, 55],
    [277, 8],
    [279, 92],
    [281, 43],
    [283, 50],
    [300, 50],
  ],
  [
    [0, 50],
    [12, 50],
    [14, 44],
    [16, 56],
    [18, 6],
    [20, 94],
    [22, 42],
    [24, 50],
    [38, 50],
    [40, 56],
    [42, 44],
    [44, 50],
    [56, 50],
    [58, 44],
    [60, 56],
    [62, 6],
    [64, 94],
    [66, 42],
    [68, 50],
    [82, 50],
    [84, 56],
    [86, 44],
    [88, 50],
    [100, 50],
    [102, 44],
    [104, 56],
    [106, 6],
    [108, 94],
    [110, 42],
    [112, 50],
    [126, 50],
    [128, 56],
    [130, 44],
    [132, 50],
    [144, 50],
    [146, 44],
    [148, 56],
    [150, 6],
    [152, 94],
    [154, 42],
    [156, 50],
    [170, 50],
    [172, 56],
    [174, 44],
    [176, 50],
    [188, 50],
    [190, 44],
    [192, 56],
    [194, 6],
    [196, 94],
    [198, 42],
    [200, 50],
    [214, 50],
    [216, 56],
    [218, 44],
    [220, 50],
    [232, 50],
    [234, 44],
    [236, 56],
    [238, 6],
    [240, 94],
    [242, 42],
    [244, 50],
    [258, 50],
    [260, 56],
    [262, 44],
    [264, 50],
    [276, 50],
    [278, 44],
    [280, 56],
    [282, 6],
    [284, 94],
    [286, 42],
    [288, 50],
    [300, 50],
  ],
  [
    [0, 50],
    [25, 50],
    [27, 58],
    [29, 42],
    [31, 5],
    [33, 95],
    [35, 58],
    [37, 42],
    [39, 50],
    [75, 50],
    [77, 58],
    [79, 42],
    [81, 5],
    [83, 95],
    [85, 58],
    [87, 42],
    [89, 50],
    [125, 50],
    [127, 58],
    [129, 42],
    [131, 5],
    [133, 95],
    [135, 58],
    [137, 42],
    [139, 50],
    [175, 50],
    [177, 58],
    [179, 42],
    [181, 5],
    [183, 95],
    [185, 58],
    [187, 42],
    [189, 50],
    [225, 50],
    [227, 58],
    [229, 42],
    [231, 5],
    [233, 95],
    [235, 58],
    [237, 42],
    [239, 50],
    [275, 50],
    [277, 58],
    [279, 42],
    [281, 5],
    [283, 95],
    [285, 58],
    [287, 42],
    [289, 50],
    [300, 50],
  ],
  [
    [0, 50],
    [4, 28],
    [8, 72],
    [12, 18],
    [16, 82],
    [20, 35],
    [24, 65],
    [28, 22],
    [32, 78],
    [36, 40],
    [40, 60],
    [44, 25],
    [48, 75],
    [52, 32],
    [56, 68],
    [60, 18],
    [64, 82],
    [68, 38],
    [72, 62],
    [76, 28],
    [80, 72],
    [84, 42],
    [88, 58],
    [92, 22],
    [96, 78],
    [100, 35],
    [104, 65],
    [108, 20],
    [112, 80],
    [116, 38],
    [120, 62],
    [124, 28],
    [128, 72],
    [132, 42],
    [136, 58],
    [140, 22],
    [144, 78],
    [148, 35],
    [152, 65],
    [156, 18],
    [160, 82],
    [164, 38],
    [168, 62],
    [172, 28],
    [176, 72],
    [180, 42],
    [184, 58],
    [188, 22],
    [192, 78],
    [196, 35],
    [200, 65],
    [204, 20],
    [208, 80],
    [212, 38],
    [216, 62],
    [220, 28],
    [224, 72],
    [228, 42],
    [232, 58],
    [236, 22],
    [240, 78],
    [244, 35],
    [248, 65],
    [252, 18],
    [256, 82],
    [260, 38],
    [264, 62],
    [268, 28],
    [272, 72],
    [276, 42],
    [280, 58],
    [284, 22],
    [288, 78],
    [292, 35],
    [296, 65],
    [300, 50],
  ],
  [
    [0, 50],
    [2, 42],
    [4, 63],
    [6, 35],
    [8, 70],
    [10, 28],
    [12, 58],
    [14, 44],
    [16, 67],
    [18, 30],
    [20, 55],
    [22, 40],
    [24, 68],
    [26, 25],
    [28, 72],
    [30, 38],
    [32, 56],
    [34, 46],
    [36, 65],
    [38, 29],
    [40, 60],
    [42, 43],
    [44, 70],
    [46, 26],
    [48, 55],
    [50, 40],
    [52, 68],
    [54, 32],
    [56, 58],
    [58, 45],
    [60, 71],
    [62, 28],
    [64, 53],
    [66, 41],
    [68, 66],
    [70, 27],
    [72, 60],
    [74, 43],
    [76, 70],
    [78, 30],
    [80, 55],
    [82, 39],
    [84, 68],
    [86, 24],
    [88, 72],
    [90, 37],
    [92, 56],
    [94, 46],
    [96, 63],
    [98, 28],
    [100, 58],
    [102, 42],
    [104, 67],
    [106, 27],
    [108, 55],
    [110, 40],
    [112, 70],
    [114, 31],
    [116, 57],
    [118, 44],
    [120, 71],
    [122, 28],
    [124, 53],
    [126, 41],
    [128, 65],
    [130, 26],
    [132, 60],
    [134, 43],
    [136, 68],
    [138, 30],
    [140, 55],
    [142, 39],
    [144, 70],
    [146, 24],
    [148, 72],
    [150, 37],
    [152, 56],
    [154, 46],
    [156, 62],
    [158, 28],
    [160, 58],
    [162, 42],
    [164, 67],
    [166, 27],
    [168, 55],
    [170, 40],
    [172, 70],
    [174, 31],
    [176, 57],
    [178, 44],
    [180, 71],
    [182, 28],
    [184, 53],
    [186, 41],
    [188, 65],
    [190, 26],
    [192, 60],
    [194, 43],
    [196, 68],
    [198, 30],
    [200, 55],
    [202, 39],
    [204, 70],
    [206, 24],
    [208, 72],
    [210, 37],
    [212, 56],
    [214, 46],
    [216, 63],
    [218, 28],
    [220, 58],
    [222, 42],
    [224, 67],
    [226, 27],
    [228, 55],
    [230, 40],
    [232, 70],
    [234, 31],
    [236, 57],
    [238, 44],
    [240, 71],
    [242, 28],
    [244, 53],
    [246, 41],
    [248, 65],
    [250, 26],
    [252, 60],
    [254, 43],
    [256, 68],
    [258, 30],
    [260, 55],
    [262, 39],
    [264, 70],
    [266, 24],
    [268, 72],
    [270, 37],
    [272, 56],
    [274, 46],
    [276, 62],
    [278, 28],
    [280, 58],
    [282, 42],
    [284, 67],
    [286, 27],
    [288, 55],
    [290, 40],
    [292, 70],
    [294, 31],
    [296, 57],
    [298, 44],
    [300, 50],
  ],
];

const ECG_COLORS = ["#22c55e", "#84cc16", "#facc15", "#f97316", "#ef4444", "#dc2626"];
const ECG_X_SPEEDS = [0.8, 1.1, 1.4, 1.0, 2.0, 2.8];
const ECG_LABELS = ["Stable", "Ill-Appearing", "Distressed", "Obtunded", "Critical", "Peri-Arrest"];

// =============================================================
// NORMALIZATION HELPERS
// =============================================================

function normalizeAnswer(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

// ---------------------------------------------
// ✅ Canonicalization for dropdown + matching
// - Fix duplicates: DVT vs Deep vein thrombosis
// - Fix spelling variations: Crohn disease vs Crohn's disease
// - Keep permissive matching, but dropdown suggestions are clean
// ---------------------------------------------

// Add as many mappings as you want over time.
// Keys MUST be normalizedKeyForDedup(...)
const CANONICAL_DIAGNOSIS_MAP: Record<string, string> = {
  // Vascular
  dvt: "Deep vein thrombosis (DVT)",
  deepveinthrombosis: "Deep vein thrombosis (DVT)",
  deepvenousthrombosis: "Deep vein thrombosis (DVT)",

  pe: "Pulmonary embolism (PE)",
  pulmonaryembolism: "Pulmonary embolism (PE)",

  // Cardio
  mi: "Myocardial infarction (MI)",
  myocardialinfarction: "Myocardial infarction (MI)",

  af: "Atrial fibrillation (AF)",
  afib: "Atrial fibrillation (AF)",
  atrialfibrillation: "Atrial fibrillation (AF)",

  // GI
  crohndisease: "Crohn disease",
  crohnsdisease: "Crohn disease",
  chrondisease: "Crohn disease", // common misspelling
  "chronsdisease": "Crohn disease",

  ulcerativecolitis: "Ulcerative colitis",

  // Renal
  ckd: "Chronic kidney disease (CKD)",
  chronickidneydisease: "Chronic kidney disease (CKD)",

  // Pulm
  copd: "Chronic obstructive pulmonary disease (COPD)",
  chronicobstructivepulmonarydisease: "Chronic obstructive pulmonary disease (COPD)",

  // Infectious
  uti: "Urinary tract infection (UTI)",
  urinarytractinfection: "Urinary tract infection (UTI)",

  // Neuro
  alzheimerdisease: "Alzheimer disease",
  alzheimersdisease: "Alzheimer disease",

  // Heme/Onc
  hodgkinlymphoma: "Hodgkin lymphoma",
  hodgkinslymphoma: "Hodgkin lymphoma",
};

function normalizeKeyForDedup(input: string) {
  const lower = input.toLowerCase().trim();

  // Normalize separators
  const compact = lower.replace(/&/g, "and").replace(/\s+/g, " ");

  // Remove punctuation → compact key
  const stripped = compact.replace(/[^a-z0-9]+/g, "");

  // VERY targeted merges for common possessive disease names
  if (stripped === "crohnsdisease") return "crohndisease";
  if (stripped === "hodgkinslymphoma") return "hodgkinlymphoma";
  if (stripped === "alzheimersdisease") return "alzheimerdisease";

  return stripped;
}

function canonicalizeDiagnosisDisplay(raw: string) {
  const key = normalizeKeyForDedup(raw);
  return CANONICAL_DIAGNOSIS_MAP[key] || raw;
}

// ✅ Canonicalize system strings so we never have duplicates like:
// "infectious disease" vs "infectious_disease" vs "infectious-disease"
function normalizeSystem(system?: string) {
  if (!system) return "";
  return system
    .toLowerCase()
    .trim()
    .replace(/\//g, "_")
    .replace(/\s+/g, "_")
    .replace(/-+/g, "_");
}

function displaySystemLabel(system?: string) {
  const s = normalizeSystem(system);
  if (!s) return "";
  return s
    .split("_")
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

// =============================================================
// STEP 1 BANK (built-in fallback)
// =============================================================

// ✅ This makes the dropdown HARDER because choices aren't limited to your case answers.
// You can remove items or expand freely. Each item should be the *canonical display*.
// If you add DIAGNOSIS_BANK_PATH in /public, that will merge on top.
const DEFAULT_STEP1_DIAGNOSIS_BANK: string[] = [
  // Cardio
  "Acute pericarditis",
  "Aortic dissection",
  "Aortic stenosis",
  "Atrial fibrillation (AF)",
  "Atrial flutter",
  "Cardiac tamponade",
  "Cardiogenic shock",
  "Dilated cardiomyopathy",
  "Hypertrophic cardiomyopathy",
  "Infective endocarditis",
  "Mitral regurgitation",
  "Mitral stenosis",
  "Myocardial infarction (MI)",
  "Pericardial effusion",
  "Stable angina",
  "Unstable angina",
  "Ventricular fibrillation",
  "Ventricular tachycardia",

  // Pulm
  "Acute respiratory distress syndrome (ARDS)",
  "Asthma",
  "Chronic obstructive pulmonary disease (COPD)",
  "Community-acquired pneumonia",
  "Legionella pneumonia",
  "Mycoplasma pneumonia",
  "Pleural effusion",
  "Pneumothorax",
  "Pulmonary embolism (PE)",
  "Pulmonary hypertension",

  // GI
  "Acute pancreatitis",
  "Achalasia",
  "Appendicitis",
  "Celiac disease",
  "Cholecystitis",
  "Cholelithiasis",
  "Cirrhosis",
  "Crohn disease",
  "Diverticulitis",
  "Esophageal varices",
  "Gastroesophageal reflux disease (GERD)",
  "Gastric ulcer",
  "Gilbert syndrome",
  "Hepatitis A",
  "Hepatitis B",
  "Hepatitis C",
  "Mallory-Weiss tear",
  "Peptic ulcer disease (PUD)",
  "Ulcerative colitis",

  // Endo
  "Addison disease",
  "Cushing syndrome",
  "Diabetes insipidus",
  "Diabetes mellitus type 1",
  "Diabetes mellitus type 2",
  "Graves disease",
  "Hashimoto thyroiditis",
  "Hyperaldosteronism (Conn syndrome)",
  "Hyperprolactinemia",
  "Hypothyroidism",
  "Pheochromocytoma",
  "Thyroid storm",

  // Neuro
  "Alzheimer disease",
  "Brain abscess",
  "Cluster headache",
  "Epilepsy",
  "Guillain-Barré syndrome",
  "Ischemic stroke",
  "Migraine",
  "Multiple sclerosis",
  "Parkinson disease",
  "Subdural hematoma",

  // Infectious
  "Chlamydia infection",
  "Cytomegalovirus (CMV) infection",
  "Diphtheria",
  "Gonorrhea",
  "Influenza",
  "Listeriosis",
  "Measles",
  "Syphilis",
  "Tetanus",
  "Toxoplasmosis",
  "Urinary tract infection (UTI)",
  "Varicella",
  "Herpes zoster",

  // Heme/Onc
  "Aplastic anemia",
  "Anemia of chronic disease",
  "Beta-thalassemia",
  "Disseminated intravascular coagulation (DIC)",
  "Factor V Leiden",
  "Folate deficiency",
  "G6PD deficiency",
  "Hemophilia A",
  "Iron deficiency anemia",
  "Polycythemia vera",
  "Sideroblastic anemia",
  "Tumor lysis syndrome",

  // Renal
  "Acute interstitial nephritis",
  "Acute kidney injury",
  "Chronic kidney disease (CKD)",
  "Nephritic syndrome",
  "Nephrotic syndrome",
  "Pyelonephritis",

  // Derm
  "Basal cell carcinoma",
  "Contact dermatitis",
  "Impetigo",
  "Psoriasis",
  "Tinea corporis",
  "Vitiligo",

  // Peds
  "Bronchiolitis",
  "Croup",
  "Hand-foot-and-mouth disease",
  "Intussusception",
  "Rotavirus infection",
];

// =============================================================
// CASE PARSING
// =============================================================

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
    const clueMatch = block.match(
      /VIGNETTE_LINES:\s*\n([\s\S]*?)(?=\nTEACHING_POINTS:\nCASE_ID:|\n={10,}|$)/
    );
    const teachMatch = block.match(/TEACHING_POINTS:\s*\n([\s\S]*?)(?=\n={10,}|$)/);
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
      .map((line) => line.replace(/^\d+\.\s*/, "").replace(/^[-\s]+/, "").trim())
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
      system: normalizeSystem(systemMatch?.[1].trim()),
    });
  }

  return cases.sort((a, b) => Number(a.id) - Number(b.id));
}

// =============================================================
// ECG RENDERING HELPERS
// =============================================================

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

function ECGCanvas({
  points,
  color,
  xSpeed,
  flatlined,
}: {
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

    const drawPath = () => {
      if (flatlined) {
        ctx.moveTo(0, 50 * scaleY);
        ctx.lineTo(W, 50 * scaleY);
        return;
      }
      points.forEach(([x, y], i) => {
        if (i === 0) ctx.moveTo(x * scaleX, y * scaleY);
        else ctx.lineTo(x * scaleX, y * scaleY);
      });
    };

    const drawFrame = () => {
      ctx.clearRect(0, 0, W, H);

      // grid
      ctx.strokeStyle = "#0d1f2d";
      ctx.lineWidth = 0.5;
      [25, 50, 75].forEach((y) => {
        ctx.beginPath();
        ctx.moveTo(0, y * scaleY);
        ctx.lineTo(W, y * scaleY);
        ctx.stroke();
      });
      [60, 120, 180, 240].forEach((x) => {
        ctx.beginPath();
        ctx.moveTo(x * scaleX, 0);
        ctx.lineTo(x * scaleX, H);
        ctx.stroke();
      });

      // line
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.2;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      drawPath();
      ctx.stroke();

      // glow
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 6;
      ctx.globalAlpha = 0.12;
      drawPath();
      ctx.stroke();
      ctx.globalAlpha = 1;

      // moving dot
      if (!flatlined) {
        dotXRef.current = (dotXRef.current + xSpeed) % 300;
        const dotY = getYatX(points, dotXRef.current);
        ctx.beginPath();
        ctx.arc(dotXRef.current * scaleX, dotY * scaleY, 4, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.95;
        ctx.fill();
        ctx.globalAlpha = 1;
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

function ECGMonitor({
  badGuesses,
  gameOver,
  won,
  guessesLeft,
}: {
  badGuesses: number;
  gameOver: boolean;
  won: boolean;
  guessesLeft: number;
}) {
  const idx = won ? 0 : Math.min(badGuesses, ECG_POINTS.length - 1);
  const flatlined = gameOver && !won;
  const color = won ? "#22c55e" : flatlined ? "#dc2626" : ECG_COLORS[idx];
  const label = won ? "Patient Saved ✓" : flatlined ? "FLATLINE" : ECG_LABELS[idx];

  return (
    <div className="w-full rounded-2xl p-3 border" style={{ background: "#011a1f", borderColor: "#0e3d4a" }}>
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
      <ECGCanvas points={ECG_POINTS[idx]} color={color} xSpeed={ECG_X_SPEEDS[idx]} flatlined={flatlined} />
    </div>
  );
}

// =============================================================
// CONFETTI
// =============================================================

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

// =============================================================
// SHARE + RESULT MODAL
// =============================================================

function ShareCard({ shareText }: { shareText: string }) {
  const [copied, setCopied] = useState(false);

  const copyShareText = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="mt-4 rounded-2xl p-4 text-left" style={{ background: "#071f26", border: "1px solid #0e3d4a" }}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-xs font-mono uppercase tracking-[0.2em]" style={{ color: "#94a3b8" }}>
          Share result
        </p>
        <button
          onClick={copyShareText}
          className="text-xs font-bold px-3 py-1.5 rounded-lg"
          style={{ background: "#14b8a6", color: "#042b33" }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="whitespace-pre-wrap text-sm leading-6 font-mono" style={{ color: "#e2e8f0" }}>
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
    const green = Math.max(1, Math.min(solvedAtClueCount, MAX_GUESSES));
    const white = Math.max(0, MAX_GUESSES - green);
    return `MEDICLE\nSolved in ${green} clue${green === 1 ? "" : "s"}\n${"🟩".repeat(green)}${"⬜".repeat(white)}`;
  }, [won, solvedAtClueCount]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)" }}>
      <div
        className="w-full max-w-lg rounded-2xl p-7 text-center shadow-2xl max-h-[90vh] overflow-y-auto"
        style={{ background: won ? "#0a3320" : "#2d0a0a", border: `1px solid ${won ? "#22c55e" : "#dc2626"}` }}
      >
        {won ? (
          <>
            <p className="text-5xl mb-3">🎉</p>
            <p className="text-3xl font-bold mb-1" style={{ color: "#86efac" }}>
              Patient Saved!
            </p>
            <p className="text-white text-xl font-semibold mb-1">{current.diagnosis}</p>
            <p className="text-sm mb-1" style={{ color: "#bbf7d0" }}>
              Diagnosed in {guesses.length} guess{guesses.length !== 1 ? "es" : ""}.
            </p>
            <p className="text-sm mb-4" style={{ color: "#bbf7d0" }}>
              Solved at clue {solvedAtClueCount}.
            </p>
            <ShareCard shareText={shareText} />
          </>
        ) : (
          <>
            <p className="text-5xl mb-3">💀</p>
            <p className="text-3xl font-bold mb-1" style={{ color: "#fca5a5" }}>
              Patient Lost
            </p>
            <p className="text-white text-sm mb-1">The diagnosis was:</p>
            <p className="text-white text-2xl font-bold mb-4">{current.diagnosis}</p>
          </>
        )}

        {current.teachingPoints.length > 0 && (
          <div className="mb-4">
            <button
              onClick={() => setShowTeaching((s) => !s)}
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

        <button
          onClick={onNext}
          className="text-white px-10 py-3 rounded-xl font-bold text-lg w-full"
          style={{ background: "#14b8a6" }}
        >
          Next Case →
        </button>
      </div>
    </div>
  );
}

// =============================================================
// MAIN COMPONENT
// =============================================================

export default function Home() {
  const [cases, setCases] = useState<Case[]>([]);
  const [externalDiagnosisBank, setExternalDiagnosisBank] = useState<string[]>([]);

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

  const [showECG, setShowECG] = useState(true);
  const [showSystem, setShowSystem] = useState(false);

  // ✅ NEW: optional system filter (checkbox panel)
  const [showSystemFilter, setShowSystemFilter] = useState(false);
  const [selectedSystems, setSelectedSystems] = useState<Set<string>>(new Set());

  const [solvedAtClueCount, setSolvedAtClueCount] = useState(1);
  const [loadError, setLoadError] = useState("");

  // =============================================================
  // LOAD CASES
  // =============================================================

  useEffect(() => {
    let active = true;

    async function loadCases() {
      try {
        // Try to load the manifest first (list of case files)
        const manifestRes = await fetch("/medicle_cases_manifest.json");
    
        let combinedText = "";
    
        if (manifestRes.ok) {
          const manifest = await manifestRes.json();
    
          // Expecting: { files: ["/medicle_cases_vol_1.txt", "/medicle_cases_vol_2.txt", ...] }
          const files: string[] = Array.isArray(manifest.files) ? manifest.files : [];
    
          if (files.length === 0) {
            throw new Error("Manifest loaded, but no files were listed in medicle_cases_manifest.json");
          }
    
          // Fetch all case files listed in the manifest
          const texts = await Promise.all(
            files.map(async (path) => {
              const r = await fetch(path);
              if (!r.ok) throw new Error(`Failed to load cases file: ${path}`);
              return await r.text();
            })
          );
    
          combinedText = texts.join("\n\n");
        } else {
          // Fallback: if manifest doesn't exist, load the original single file
          const response = await fetch(CASES_PATH);
          if (!response.ok) throw new Error(`Failed to load cases from ${CASES_PATH}`);
          combinedText = await response.text();
        }
    
        const parsed = parseCases(combinedText);
    
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
    

    loadCases();

    return () => {
      active = false;
    };
  }, []);

  // =============================================================
  // LOAD OPTIONAL STEP 1 DIAGNOSIS BANK (makes dropdown harder)
  // =============================================================

  useEffect(() => {
    let active = true;

    async function loadBank() {
      try {
        const res = await fetch(DIAGNOSIS_BANK_PATH);
        if (!res.ok) return;

        const txt = await res.text();
        const items = txt
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);

        if (!active) return;
        setExternalDiagnosisBank(items);
      } catch {
        // ignore
      }
    }

    loadBank();

    return () => {
      active = false;
    };
  }, []);

  // =============================================================
  // SYSTEM FILTER HELPERS
  // =============================================================

  const allSystems = useMemo(() => {
    const set = new Set<string>();
    cases.forEach((c) => {
      if (c.system) set.add(normalizeSystem(c.system));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [cases]);

  const eligibleCases = useMemo(() => {
    if (selectedSystems.size === 0) return cases;
    return cases.filter((c) => c.system && selectedSystems.has(normalizeSystem(c.system)));
  }, [cases, selectedSystems]);

  const toggleSystem = useCallback((system: string) => {
    setSelectedSystems((prev) => {
      const next = new Set(prev);
      const key = normalizeSystem(system);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // If a filter is active and current doesn't match, jump into an eligible case.
  useEffect(() => {
    if (!current) return;
    if (selectedSystems.size === 0) return;

    const curSys = normalizeSystem(current.system);
    const matches = curSys && selectedSystems.has(curSys);
    if (matches) return;

    if (eligibleCases.length === 0) return;

    const next = eligibleCases[Math.floor(Math.random() * eligibleCases.length)];
    setSeenIds(new Set([next.id]));
    resetRound(next);
  }, [current, eligibleCases, selectedSystems]);

  // =============================================================
  // GAME ROUND UTILITIES
  // =============================================================

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
    setShowECG(true);
    setSolvedAtClueCount(1);
  }, []);

  const loadCaseById = useCallback(
    (caseId: string) => {
      if (!eligibleCases.length) return;
      const nextCase = eligibleCases.find((c) => c.id === caseId);
      if (!nextCase) return;
      setSeenIds(new Set([nextCase.id]));
      resetRound(nextCase);
    },
    [eligibleCases, resetRound]
  );

  const startNextCase = useCallback(() => {
    if (!eligibleCases.length || !current) return;

    const newSeen = new Set(seenIds);
    newSeen.add(current.id);

    const next = pickNewCase(eligibleCases, newSeen);
    setSeenIds(new Set([...newSeen, next.id]));
    resetRound(next);
  }, [eligibleCases, current, pickNewCase, resetRound, seenIds]);

  // =============================================================
  // DROPDOWN ANSWER BANK (FIXES DUPES + EXPANDS POOL)
  // =============================================================

  const allDiagnoses = useMemo(() => {
    const fromCases = eligibleCases.flatMap((c) => [c.diagnosis, ...c.aliases]);
    const combined = [...DEFAULT_STEP1_DIAGNOSIS_BANK, ...externalDiagnosisBank, ...fromCases];

    // Canonicalize + dedupe
    const map = new Map<string, string>();

    for (const item of combined) {
      const canonical = canonicalizeDiagnosisDisplay(item);
      const key = normalizeKeyForDedup(canonical);

      // Prefer longer label if collision
      const prev = map.get(key);
      if (!prev || canonical.length > prev.length) {
        map.set(key, canonical);
      }
    }

    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [eligibleCases, externalDiagnosisBank]);

  const caseOptions = useMemo(
    () =>
      eligibleCases.map((c) => ({
        id: c.id,
        label: showSystem ? `Case ${c.id}${c.system ? ` • ${displaySystemLabel(c.system)}` : ""}` : `Case ${c.id}`,
      })),
    [eligibleCases, showSystem]
  );

  const filtered = useMemo(() => {
    const q = guess.trim().toLowerCase();
    if (!q) return [];

    const qKey = normalizeKeyForDedup(q);

    return allDiagnoses
      .filter((d) => {
        const dLower = d.toLowerCase();
        if (dLower.includes(q)) return true;
        const dKey = normalizeKeyForDedup(d);
        return dKey.includes(qKey);
      })
      .slice(0, 10);
  }, [allDiagnoses, guess]);

  const badGuesses = guesses.filter((g) => !g.correct).length;
  const guessesLeft = MAX_GUESSES - guesses.length;

  // =============================================================
  // SUBMIT GUESS (FIX: canonical equivalence)
  // =============================================================

  const submitGuess = useCallback(
    (text: string, skipped = false) => {
      if (!current || gameOver) return;

      const g = text.trim();
      if (!g && !skipped) return;

      const correct =
        !skipped &&
        [current.diagnosis, ...current.aliases].some((answer) => {
          // Permissive matching, plus canonical collapse.
          const aCanon = canonicalizeDiagnosisDisplay(answer);
          const gCanon = canonicalizeDiagnosisDisplay(g);

          return (
            normalizeKeyForDedup(aCanon) === normalizeKeyForDedup(gCanon) ||
            normalizeAnswer(answer) === normalizeAnswer(g)
          );
        });

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

  // =============================================================
  // LOADING / ERROR STATES
  // =============================================================

  if (loadError) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4" style={{ background: "#022129" }}>
        <div className="max-w-xl rounded-2xl p-6 border" style={{ background: "#0a2f38", borderColor: "#0e3d4a" }}>
          <p className="text-white text-lg font-semibold mb-2">Could not load the cases file.</p>
          <p className="text-sm" style={{ color: "#94a3b8" }}>
            {loadError}
          </p>
          <p className="text-sm mt-3" style={{ color: "#94a3b8" }}>
            Put <span className="font-mono">cases_master_250.txt</span> in your <span className="font-mono">public</span> folder.
          </p>
        </div>
      </main>
    );
  }

  if (!current) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: "#022129" }}>
        <p className="text-white text-xl">Loading...</p>
      </main>
    );
  }

  // =============================================================
  // UI
  // =============================================================

  return (
    <main className="min-h-screen flex flex-col items-center px-4 pb-16" style={{ background: "#022129" }}>
      {showConfetti && <Confetti />}
      <Analytics />

      {/* GAME OVER MODAL */}
      {gameOver && current && (
        <ResultModal
          won={won}
          current={current}
          guesses={guesses}
          solvedAtClueCount={solvedAtClueCount}
          onNext={startNextCase}
        />
      )}

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
          defaultValue="medicle"
          style={{
            background: "#0a2f38",
            border: "1px solid #0e3d4a",
            color: "#ffffff",
            borderRadius: "8px",
            padding: "6px 10px",
            fontSize: "12px",
          }}
        >
          <option value="medicle">🧠 Medicle</option>
          <option value="vettle">🐾 Vettle — Veterinary cases</option>
          <option value="psychodle">🧩 Psychodle — Psychiatry cases</option>
          <option value="dentdle">🦷 Dentdle — Dental cases</option>
          <option value="crimindle">⚖️ Crimindle — Criminal Law</option>
        </select>
      </div>

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
        <img src="/logo.png" alt="Medicle" style={{ height: "80px" }} />

        <div
          style={{
            background: "#044",
            border: "1px solid #0e3d4a",
            borderRadius: "16px",
            padding: "16px 20px",
            maxWidth: "720px",
            width: "100%",
          }}
        >
          <p style={{ fontSize: "15px", color: "#ffffff", fontWeight: "600", marginBottom: "6px" }}>
            Can you diagnose the patient before it's too late?
          </p>
          <p style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "8px" }}>
            Endless progressive clue-based vignettes. A new case every round.
          </p>
          <a
            href="https://www.medicle.net"
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: "13px", fontWeight: "bold", color: "#14b8a6", textDecoration: "none" }}
          >
            🔗 www.medicle.net
          </a>
        </div>

        <div className="w-full max-w-3xl grid gap-3 sm:grid-cols-[1fr_auto] items-center">
          <div className="text-left">
            <label className="block text-xs font-mono tracking-widest mb-1" style={{ color: "#6b7280" }}>
              Jump to case
            </label>
            <select
              value={selectedCaseId}
              onChange={(e) => loadCaseById(e.target.value)}
              className="w-full rounded-xl px-3 py-2 text-sm outline-none"
              style={{ background: "#0a2f38", border: "1px solid #0e3d4a", color: "white" }}
              disabled={!eligibleCases.length}
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
              <p className="text-xs font-mono tracking-widest" style={{ color: "#6b7280" }}>
                CURRENT CASE
              </p>
              <p className="text-lg font-bold" style={{ color: "#e2e8f0" }}>
                #{current.id}
              </p>
              {showSystem && current.system && (
                <p className="text-xs" style={{ color: "#4a9aaa" }}>
                  {displaySystemLabel(current.system)}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* PROGRESS */}
      <div className="flex items-center gap-2 mb-3 text-sm w-full max-w-3xl" style={{ color: "#6b7280" }}>
        <span className="whitespace-nowrap">
          Clue {revealed}/{current.clues.length}
        </span>
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "#0e3d4a" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${(revealed / current.clues.length) * 100}%`, background: "#14b8a6" }}
          />
        </div>
        <span className="text-xs font-mono whitespace-nowrap" style={{ color: "#6b7280" }}>
          {guessesLeft} guess{guessesLeft !== 1 ? "es" : ""} left
        </span>
      </div>

      {/* CLUES */}
      <div className="w-full max-w-3xl space-y-2 mb-4">
        {current.clues.slice(0, revealed).map((clue, i) => (
          <div
            key={i}
            className="rounded-xl px-4 py-3 text-sm border-l-4 transition-all duration-300"
            style={{
              background: "#0a2f38",
              borderColor: i === revealed - 1 ? "#14b8a6" : "#0e3d4a",
              color: "#e2e8f0",
            }}
          >
            <span className="text-xs font-mono mr-2" style={{ color: "#2d7a8a" }}>
              #{i + 1}
            </span>
            {clue}
          </div>
        ))}
      </div>

      {/* INPUT + DROPDOWN */}
      {!gameOver && (
        <div className="relative w-full max-w-3xl mb-2">
          <div className="flex gap-2">
            <input
              className="min-w-0 flex-1 rounded-xl text-white px-3 py-2 outline-none text-sm"
              style={{ background: "#0a2f38", border: "1px solid #0e3d4a", color: "white" }}
              placeholder="Enter diagnosis..."
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
              className="text-white py-2 rounded-xl font-bold text-sm shrink-0"
              style={{ background: "#14b8a6", minWidth: "64px" }}
            >
              Guess
            </button>

            <button
              onClick={() => submitGuess("", true)}
              className="text-white py-2 rounded-xl font-bold text-sm shrink-0"
              style={{ background: "#0e3d4a", minWidth: "52px" }}
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
                  className="px-4 py-2 text-white cursor-pointer text-sm"
                  style={{ borderBottom: "1px solid #0e3d4a" }}
                  onMouseDown={() => submitGuess(d)}
                  onMouseOver={(e) => (e.currentTarget.style.background = "#14b8a6")}
                  onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {d}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* GUESSES */}
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

      {/* MONITOR + FILTER BUTTONS */}
      <div className="mt-8 w-full max-w-3xl">
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => setShowECG((s) => !s)}
            className="flex items-center gap-2 text-xs font-mono mb-2 px-3 py-1 rounded-lg transition-all"
            style={{
              background: showECG ? "#0a2f38" : "transparent",
              border: "1px solid #0e3d4a",
              color: showECG ? "#14b8a6" : "#2d7a8a",
            }}
          >
            <span style={{ color: showECG ? "#22c55e" : "#2d7a8a" }}>●</span>
            {showECG ? "Hide" : "Show"} Patient Monitor
          </button>

          <button
            onClick={() => setShowSystem((s) => !s)}
            className="flex items-center gap-2 text-xs font-mono mb-2 px-3 py-1 rounded-lg transition-all"
            style={{
              background: showSystem ? "#0a2f38" : "transparent",
              border: "1px solid #0e3d4a",
              color: showSystem ? "#14b8a6" : "#2d7a8a",
            }}
          >
            <span style={{ color: showSystem ? "#14b8a6" : "#2d7a8a" }}>●</span>
            {showSystem ? "Hide" : "Show"} Body System
          </button>

          <button
            onClick={() => setShowSystemFilter((s) => !s)}
            className="flex items-center gap-2 text-xs font-mono mb-2 px-3 py-1 rounded-lg transition-all"
            style={{
              background: showSystemFilter ? "#0a2f38" : "transparent",
              border: "1px solid #0e3d4a",
              color: showSystemFilter ? "#14b8a6" : "#2d7a8a",
            }}
          >
            <span style={{ color: selectedSystems.size > 0 ? "#14b8a6" : "#2d7a8a" }}>●</span>
            Filter Systems{selectedSystems.size > 0 ? ` (${selectedSystems.size})` : ""}
          </button>
        </div>

        {showSystemFilter && (
          <div className="w-full rounded-xl p-3 border mb-2" style={{ background: "#0a2f38", borderColor: "#0e3d4a" }}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-mono tracking-widest" style={{ color: "#6b7280" }}>
                FILTER BY BODY SYSTEM (OPTIONAL)
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedSystems(new Set())}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg"
                  style={{ background: "#0e3d4a", color: "#e2e8f0" }}
                >
                  Clear
                </button>
                <button
                  onClick={() => setSelectedSystems(new Set(allSystems))}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg"
                  style={{ background: "#14b8a6", color: "#042b33" }}
                >
                  Select all
                </button>
              </div>
            </div>

            {allSystems.length === 0 ? (
              <p className="text-sm mt-2" style={{ color: "#94a3b8" }}>
                No body-system tags were found in your cases file.
              </p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {allSystems.map((sys) => (
                  <label
                    key={sys}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs cursor-pointer select-none"
                    style={{
                      background: selectedSystems.has(sys) ? "rgba(20,184,166,0.12)" : "transparent",
                      borderColor: selectedSystems.has(sys) ? "#14b8a6" : "#0e3d4a",
                      color: selectedSystems.has(sys) ? "#e2e8f0" : "#94a3b8",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSystems.has(sys)}
                      onChange={() => toggleSystem(sys)}
                      style={{ accentColor: "#14b8a6" }}
                    />
                    <span>{displaySystemLabel(sys)}</span>
                  </label>
                ))}
              </div>
            )}

            {selectedSystems.size > 0 && (
              <p className="text-xs mt-3" style={{ color: "#2d7a8a" }}>
                Active filter: {Array.from(selectedSystems).map(displaySystemLabel).join(", ")}
              </p>
            )}

            <p className="text-xs mt-2" style={{ color: "#1d5a66" }}>
              Tip: If you pick systems here, the game will only pull new cases from those systems for this session.
            </p>
          </div>
        )}

        {showECG && <ECGMonitor badGuesses={badGuesses} gameOver={gameOver} won={won} guessesLeft={guessesLeft} />}
      </div>

      {/* FOOTER */}
      <div className="mt-8 w-full max-w-3xl text-center space-y-3">
        <p className="text-xs" style={{ color: "#2d7a8a" }}>
          ⚠️ Cases are AI-generated for educational purposes only and may contain inaccuracies. Not for clinical use.
        </p>
        <p className="text-xs" style={{ color: "#1d5a66" }}>
          Medicle is an independent, fan-made endless diagnosis game inspired by{" "}
          <a href="https://doctordle.org" target="_blank" rel="noopener noreferrer" style={{ color: "#14b8a6" }}>
            Doctordle
          </a>
          . We built this as a complement, not a competitor, so medical students can practice endlessly.
        </p>
        <p className="text-xs" style={{ color: "#2d7a8a" }}>
          Questions or feedback?{" "}
          <a href="mailto:jubolanosmed@gmail.com" style={{ color: "#14b8a6" }}>
            Contact us
          </a>
        </p>
      </div>
    </main>
  );
}
