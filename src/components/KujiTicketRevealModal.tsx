"use client";

import {
  Check,
  Copy,
  Gift,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Star,
  Ticket,
  Trophy,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { KujiDrawResult, KujiPrize } from "../services/kuji.service";

// Web Audio API Synthesizer for high-fidelity interactive SFX without external audio files
function playKujiSound(
  type: "whoosh" | "tear" | "stamp" | "fanfare" | "click",
  enabled: boolean,
) {
  if (!enabled || typeof window === "undefined") return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") {
      void ctx.resume();
    }
    const now = ctx.currentTime;

    if (type === "whoosh") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(580, now + 0.35);
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === "tear") {
      // Paper tear white-noise friction
      const bufferSize = ctx.sampleRate * 0.3;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 2400;
      filter.Q.value = 3.0;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);
    } else if (type === "stamp") {
      // Heavy ink stamp thud
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.22);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    } else if (type === "fanfare") {
      // Multi-note celebration chime (C5 -> E5 -> G5 -> C6)
      const freqs = [523.25, 659.25, 783.99, 1046.5];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.value = freq;
        const start = now + idx * 0.09;
        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(0.22, start + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.85);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.9);
      });
    } else if (type === "click") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, now);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    }
  } catch {
    // Ignore if audio permissions blocked
  }
}

function gradeVisualTheme(grade: string) {
  switch (grade) {
    case "A":
      return {
        badgeBg: "bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 text-zinc-950 ring-4 ring-amber-300/80 shadow-amber-500/50",
        auraGradient: "from-amber-500/30 via-yellow-500/20 to-transparent",
        kanjiText: "A賞 (特賞)",
        tierTitle: "รางวัลเกรด A · ฟิกเกอร์สเกลแท้ระดับพรีเมียม",
        sparkleColor: "text-amber-400",
        cardBorder: "border-amber-400/60 dark:border-amber-400/80 shadow-amber-500/20",
      };
    case "B":
      return {
        badgeBg: "bg-gradient-to-br from-rose-500 via-rose-600 to-pink-700 text-white ring-4 ring-rose-300/80 shadow-rose-500/50",
        auraGradient: "from-rose-500/30 via-pink-500/20 to-transparent",
        kanjiText: "B賞",
        tierTitle: "รางวัลเกรด B · ฟิกเกอร์พิเศษโมเดลแท้",
        sparkleColor: "text-rose-400",
        cardBorder: "border-rose-400/60 dark:border-rose-400/80 shadow-rose-500/20",
      };
    case "C":
      return {
        badgeBg: "bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-700 text-white ring-4 ring-purple-300/80 shadow-purple-500/50",
        auraGradient: "from-purple-500/30 via-indigo-500/20 to-transparent",
        kanjiText: "C賞",
        tierTitle: "รางวัลเกรด C · สแตนดี้และของสะสมอะคริลิก",
        sparkleColor: "text-purple-400",
        cardBorder: "border-purple-400/60 dark:border-purple-400/80 shadow-purple-500/20",
      };
    case "D":
      return {
        badgeBg: "bg-gradient-to-br from-blue-500 via-blue-600 to-sky-700 text-white ring-4 ring-blue-300/80 shadow-blue-500/50",
        auraGradient: "from-blue-500/30 via-sky-500/20 to-transparent",
        kanjiText: "D賞",
        tierTitle: "รางวัลเกรด D · สแตนดี้มินิ & พวงกุญแจกู๊ดส์",
        sparkleColor: "text-blue-400",
        cardBorder: "border-blue-400/60 dark:border-blue-400/80 shadow-blue-500/20",
      };
    default:
      return {
        badgeBg: "bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 text-white ring-4 ring-emerald-300/80 shadow-emerald-500/50",
        auraGradient: "from-emerald-500/30 via-teal-500/20 to-transparent",
        kanjiText: `${grade}賞`,
        tierTitle: `รางวัลเกรด ${grade} · แฟ้มและของสะสมพรีเมียม`,
        sparkleColor: "text-emerald-400",
        cardBorder: "border-emerald-400/60 dark:border-emerald-400/80 shadow-emerald-500/20",
      };
  }
}

interface KujiTicketRevealModalProps {
  result: KujiDrawResult;
  onClose: () => void;
  onClaim: (prize: KujiPrize) => void;
  onDrawAgain?: () => void;
  canDrawAgain: boolean;
  pointsPerDraw: number;
  userPoints: number;
}

type DrawPhase = "APPEAR" | "TEAR" | "UNFOLD" | "REVEAL";

export default function KujiTicketRevealModal({
  result,
  onClose,
  onClaim,
  onDrawAgain,
  canDrawAgain,
  pointsPerDraw,
  userPoints,
}: KujiTicketRevealModalProps) {
  const [phase, setPhase] = useState<DrawPhase>("APPEAR");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showConfirmDrawAgain, setShowConfirmDrawAgain] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const theme = gradeVisualTheme(result.prize.grade);

  // Initialize sound preference
  useEffect(() => {
    try {
      const stored = localStorage.getItem("kuji_sound_enabled");
      if (stored !== null) {
        setSoundEnabled(stored === "true");
      }
    } catch {
      // Ignore
    }
  }, []);

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("kuji_sound_enabled", String(next));
      } catch {
        // Ignore
      }
      return next;
    });
  };

  // Cinematic timeline sequence
  useEffect(() => {
    // 1. Initial Whoosh sound
    playKujiSound("whoosh", soundEnabled);

    // 2. Tear phase at 600ms
    const tearTimer = setTimeout(() => {
      setPhase("TEAR");
      playKujiSound("tear", soundEnabled);
    }, 600);

    // 3. Unfold & Stamp phase at 1500ms
    const unfoldTimer = setTimeout(() => {
      setPhase("UNFOLD");
      playKujiSound("stamp", soundEnabled);
    }, 1500);

    // 4. Reveal & Celebration Fanfare at 2400ms
    const revealTimer = setTimeout(() => {
      setPhase("REVEAL");
      playKujiSound("fanfare", soundEnabled);
    }, 2400);

    return () => {
      clearTimeout(tearTimer);
      clearTimeout(unfoldTimer);
      clearTimeout(revealTimer);
    };
  }, [result, soundEnabled]);

  // Canvas Confetti effect during REVEAL phase
  useEffect(() => {
    if (phase !== "REVEAL") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ["#F59E0B", "#EF4444", "#10B981", "#8B5CF6", "#38BDF8", "#EC4899", "#FCD34D"];
    const particles = Array.from({ length: 90 }).map(() => ({
      x: canvas.width / 2 + (Math.random() * 200 - 100),
      y: canvas.height / 2 - 100,
      vx: (Math.random() * 12 - 6) * 1.5,
      vy: (Math.random() * -14 - 4),
      size: Math.random() * 8 + 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotationSpeed: Math.random() * 10 - 5,
      opacity: 1,
    }));

    let animId: number;
    function render() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35; // gravity
        p.vx *= 0.98;
        p.rotation += p.rotationSpeed;
        p.opacity -= 0.007;

        if (p.opacity > 0 && p.y < canvas.height) {
          alive = true;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.globalAlpha = Math.max(0, p.opacity);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
          ctx.restore();
        }
      });

      if (alive) {
        animId = requestAnimationFrame(render);
      }
    }

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [phase]);

  const handleSkip = () => {
    setPhase("REVEAL");
    playKujiSound("fanfare", soundEnabled);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-in fade-in duration-200 select-none"
    >
      {/* Background Ambience Glow */}
      <div
        className={`pointer-events-none absolute h-[500px] w-[500px] rounded-full bg-gradient-radial ${theme.auraGradient} blur-3xl transition-opacity duration-1000 ${
          phase === "REVEAL" ? "opacity-100 scale-125" : "opacity-60 scale-100"
        }`}
      />

      {/* Confetti Canvas */}
      {phase === "REVEAL" && (
        <canvas
          ref={canvasRef}
          className="pointer-events-none fixed inset-0 z-50 h-full w-full"
        />
      )}

      {/* Top Controls: Sound Toggle & Skip */}
      <div className="absolute right-4 top-4 z-50 flex items-center gap-2">
        <button
          type="button"
          onClick={toggleSound}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20"
          title={soundEnabled ? "ปิดเสียง" : "เปิดเสียง"}
        >
          {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>

        {phase !== "REVEAL" && (
          <button
            type="button"
            onClick={handleSkip}
            className="flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-md transition hover:bg-white/20"
          >
            <span>ข้าม (Skip)</span>
            <span>→</span>
          </button>
        )}

        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20"
          aria-label="ปิด"
        >
          <X size={16} />
        </button>
      </div>

      {/* Main Interactive Stage */}
      <div className="relative z-10 w-full max-w-md text-center">
        {/* ================= STAGE 1: TICKET TEARING & OPENING (PHASE !== REVEAL) ================= */}
        {phase !== "REVEAL" ? (
          <div className="flex flex-col items-center justify-center py-6">
            <p className="mb-6 text-sm font-black tracking-widest text-amber-300 animate-pulse">
              {phase === "APPEAR" && "กำลังหยิบตั๋วออกจากตู้..."}
              {phase === "TEAR" && "กำลังฉีกซองตั๋วอิชิบังกุจิ..."}
              {phase === "UNFOLD" && "กำลังเปิดผลรางวัลฉลาก..."}
            </p>

            {/* The Authentic 3D Japanese Kuji Ticket Envelope */}
            <div
              className={`relative w-72 h-96 rounded-2xl border-2 border-amber-400/80 bg-gradient-to-b from-red-700 via-red-800 to-rose-950 p-4 shadow-2xl shadow-red-950/70 transition-transform duration-500 ${
                phase === "UNFOLD" ? "scale-105" : "hover:scale-102"
              }`}
            >
              {/* Traditional Gold Foil Japanese Pattern Header */}
              <div className="relative overflow-hidden rounded-xl border border-amber-300/40 bg-amber-500/10 p-2.5 text-center">
                <div className="inline-flex items-center gap-1.5 text-amber-300 text-xs font-black tracking-wider">
                  <Ticket size={13} />
                  <span>一番くじ ICHIBAN KUJI</span>
                </div>
                <div className="mt-1 text-[11px] font-bold text-amber-200/90">
                  SPECIAL LOTTERY TICKET
                </div>
              </div>

              {/* Tearing Perforation Strip */}
              <div className="relative my-4">
                <div className="h-0.5 w-full border-b-2 border-dashed border-amber-300/70" />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-900 px-3 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-300 border border-amber-400/50">
                  {phase === "TEAR" ? "TEARING..." : "PEEL HERE ฉีกที่นี่"}
                </span>

                {/* Simulated Flying Top Corner Tear Animation */}
                {phase === "TEAR" && (
                  <div className="absolute -right-4 -top-8 h-10 w-24 rounded-lg bg-gradient-to-r from-amber-400 to-red-600 shadow-xl transform rotate-12 translate-x-6 -translate-y-4 opacity-0 transition-all duration-700 pointer-events-none" />
                )}
              </div>

              {/* Inside Ticket Slip (Unfolding Effect) */}
              <div
                className={`relative mx-auto flex h-48 w-56 flex-col items-center justify-center rounded-xl border border-amber-300/60 bg-amber-50 p-4 shadow-inner text-zinc-950 transition-all duration-500 ${
                  phase === "UNFOLD"
                    ? "scale-100 opacity-100 rotate-0"
                    : "scale-90 opacity-40 -rotate-3"
                }`}
              >
                <div className="text-[10px] font-black tracking-widest text-zinc-500 uppercase">
                  WINNING RESULT
                </div>

                {/* Slammed Japanese Ink Stamp */}
                <div
                  className={`mt-2 flex h-20 w-20 items-center justify-center rounded-2xl text-3xl font-black shadow-xl transition-all duration-300 ${
                    phase === "UNFOLD"
                      ? "scale-100 opacity-100"
                      : "scale-150 opacity-0"
                  } ${theme.badgeBg}`}
                >
                  {result.prize.grade}
                </div>

                <div className="mt-2 text-xs font-black tracking-tight text-zinc-900">
                  {theme.kanjiText}
                </div>
                <div className="text-[10px] text-zinc-500">
                  ตั๋วใบที่ #{result.ticketNumber}
                </div>
              </div>

              {/* Footer barcode & Seal */}
              <div className="mt-3 flex items-center justify-between px-2 text-[10px] font-mono text-amber-300/80">
                <span>BANDAI OFFICIAL</span>
                <span className="inline-flex items-center gap-1">
                  <Star size={10} className="fill-amber-400 text-amber-400" aria-hidden="true" />
                  GUARANTEED
                  <Star size={10} className="fill-amber-400 text-amber-400" aria-hidden="true" />
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* ================= STAGE 2: PRIZE CELEBRATION SHOWCASE (PHASE === REVEAL) ================= */
          <div
            className={`relative overflow-hidden rounded-3xl border ${theme.cardBorder} bg-white p-6 shadow-2xl dark:bg-zinc-900 text-center animate-in zoom-in-95 duration-300`}
          >
            {/* Header Ribbon */}
            <div className="mx-auto inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 px-4 py-1 text-xs font-black text-zinc-950 shadow-md mb-2">
              <Trophy size={14} />
              <span>ยินดีด้วย! คุณได้รับรางวัลเกรด {result.prize.grade}</span>
            </div>

            {/* Giant Grade Stamp */}
            <div className="my-2">
              <span
                className={`inline-flex h-16 w-16 items-center justify-center rounded-2xl text-3xl font-black shadow-lg ${theme.badgeBg}`}
              >
                {result.prize.grade}
              </span>
              <p className="mt-1 text-xs font-extrabold text-amber-600 dark:text-amber-400">
                {theme.tierTitle}
              </p>
            </div>

            {/* Prize Image with Golden Halo */}
            <div className="relative mx-auto my-3 h-48 w-48 overflow-hidden rounded-2xl border-2 border-amber-300/60 dark:border-amber-400/50 shadow-xl bg-zinc-100 dark:bg-zinc-800">
              <img
                src={result.prize.imageUrl}
                alt={result.prize.title}
                className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
              />
              <div className="absolute bottom-2 right-2 rounded-lg bg-black/75 px-2 py-0.5 text-[10px] font-black text-amber-300 backdrop-blur-xs">
                มูลค่า ฿{result.prize.valueBaht.toLocaleString("th-TH")}
              </div>
            </div>

            {/* Title & Description */}
            <h3 className="text-base font-black text-zinc-900 dark:text-zinc-50 px-2 leading-snug">
              {result.prize.title}
            </h3>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 px-4">
              {result.prize.description}
            </p>

            {/* Action Buttons */}
            <div className="mt-5 flex flex-col gap-2.5">
              {result.prize.isDiscountCode ? (
                <button
                  type="button"
                  onClick={() => handleCopyCode(result.prize.discountCode || "KUJI50")}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-xs font-black text-white shadow-md transition hover:bg-blue-700 active:scale-95"
                >
                  {copiedCode ? (
                    <>
                      <Check size={15} />
                      <span>คัดลอกโค้ดสำเร็จ!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={15} />
                      <span>คัดลอกโค้ดส่วนลด ({result.prize.discountCode || "KUJI50"})</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onClaim(result.prize)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 py-3 text-xs font-black text-white shadow-lg shadow-orange-600/30 transition hover:brightness-110 active:scale-95"
                >
                  <ShoppingBag size={15} />
                  <span>รับของรางวัลลงตะกร้าสินค้าทันที (฿0)</span>
                </button>
              )}

              {/* Draw Again Confirmation Box or Button */}
              {onDrawAgain && (
                showConfirmDrawAgain ? (
                  <div className="rounded-2xl border-2 border-amber-400 bg-amber-50/95 p-3.5 text-center shadow-lg dark:border-amber-500/80 dark:bg-zinc-950/95 animate-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-center gap-1.5 text-xs font-black text-amber-900 dark:text-amber-300">
                      <Ticket size={15} className="text-amber-600 dark:text-amber-400" />
                      <span>ต้องการฉีกตั๋วอีกใบใช่หรือไม่?</span>
                    </div>

                    {/* Point Deduction Breakdown */}
                    <div className="my-2.5 rounded-xl border border-amber-200 bg-white p-2.5 text-xs dark:border-zinc-800 dark:bg-zinc-900 shadow-inner">
                      <div className="flex items-center justify-between py-0.5 text-zinc-600 dark:text-zinc-400 text-[11px]">
                        <span>แต้มปัจจุบัน:</span>
                        <span className="font-bold text-zinc-900 dark:text-zinc-100">{userPoints.toLocaleString("th-TH")} P</span>
                      </div>
                      <div className="flex items-center justify-between py-1 border-t border-dashed border-zinc-200 dark:border-zinc-800 text-rose-600 dark:text-rose-400 font-bold">
                        <span>หักแต้มสะสม:</span>
                        <span className="font-black text-sm">-{pointsPerDraw.toLocaleString("th-TH")} P</span>
                      </div>
                      <div className="flex items-center justify-between py-0.5 border-t border-zinc-200 dark:border-zinc-800 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                        <span>แต้มคงเหลือ:</span>
                        <span className="font-black">{(userPoints - pointsPerDraw).toLocaleString("th-TH")} P</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowConfirmDrawAgain(false);
                          onDrawAgain();
                        }}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-2.5 text-xs font-black text-zinc-950 shadow-md transition hover:brightness-105 active:scale-95"
                      >
                        <Sparkles size={14} />
                        <span>ยืนยันฉีกตั๋ว (-{pointsPerDraw} P)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowConfirmDrawAgain(false)}
                        className="rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                      >
                        ยกเลิก
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={!canDrawAgain}
                    onClick={() => setShowConfirmDrawAgain(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50/70 py-2.5 text-xs font-black text-amber-900 transition hover:bg-amber-100 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-950/70 active:scale-95 disabled:opacity-50"
                  >
                    <RefreshCw size={13} />
                    <span>
                      ฉีกตั๋วอีกใบ ({pointsPerDraw} P) · มี {userPoints} P
                    </span>
                  </button>
                )
              )}

              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-zinc-200 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800/80 transition"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
