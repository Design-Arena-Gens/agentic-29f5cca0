"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type LyricLine = {
  text: string;
  start: number; // seconds
  duration: number; // seconds
};

type Note = {
  freq: number;
  start: number; // absolute seconds from song start
  duration: number; // seconds
  gain: number;
};

const BPM = 96;
const beat = 60 / BPM;

// Simple melody approximation in C major. Timing aligns w/ lyric lines below.
function buildMelody(): { notes: Note[]; totalDuration: number; lyricLines: LyricLine[] } {
  // Frequency helpers
  const A4 = 440;
  const semitone = Math.pow(2, 1 / 12);
  const note = (n: number) => A4 * Math.pow(semitone, n); // n semitones relative to A4
  // Map common tones near middle C range
  const C4 = note(-9); // ~261.63
  const D4 = note(-7);
  const E4 = note(-5);
  const F4 = note(-4);
  const G4 = note(-2);
  const A4n = A4;
  const C5 = note(3);

  // Lines and rough phrasing. We'll keep it cheerful and simple.
  const lines: LyricLine[] = [
    { text: "Peekaboo!", start: 0, duration: 2 * beat },
    { text: "Johny Johny", start: 2 * beat, duration: 4 * beat },
    { text: "Yes Papa", start: 6 * beat, duration: 4 * beat },
    { text: "Eating sugar?", start: 10 * beat, duration: 4 * beat },
    { text: "No, Papa", start: 14 * beat, duration: 4 * beat },
    { text: "Telling lies?", start: 18 * beat, duration: 4 * beat },
    { text: "No, Papa", start: 22 * beat, duration: 4 * beat },
    { text: "Open your mouth", start: 26 * beat, duration: 4 * beat },
    { text: "Ha ha ha!", start: 30 * beat, duration: 4 * beat }
  ];

  const notes: Note[] = [];
  const push = (freq: number, startBeats: number, durBeats: number, gain = 0.16) => {
    notes.push({
      freq,
      start: startBeats * beat,
      duration: durBeats * beat,
      gain
    });
  };

  // Peekaboo flourish
  push(G4, 0, 0.5);
  push(C5, 0.5, 0.5);

  // Johny Johny (C E G E | C E G E)
  push(C4, 2, 0.5);
  push(E4, 2.5, 0.5);
  push(G4, 3, 0.5);
  push(E4, 3.5, 0.5);
  push(C4, 4, 0.5);
  push(E4, 4.5, 0.5);
  push(G4, 5, 0.5);
  push(E4, 5.5, 0.5);

  // Yes Papa (G A G F | E C)
  push(G4, 6, 0.5);
  push(A4n, 6.5, 0.5);
  push(G4, 7, 0.5);
  push(F4, 7.5, 0.5);
  push(E4, 8, 0.5);
  push(C4, 8.5, 1.5);

  // Eating sugar? (C C D E | E D C)
  push(C4, 10, 0.5);
  push(C4, 10.5, 0.5);
  push(D4, 11, 0.5);
  push(E4, 11.5, 0.5);
  push(E4, 12, 0.5);
  push(D4, 12.5, 0.5);
  push(C4, 13, 1.0);

  // No, Papa (G A G F | E C)
  push(G4, 14, 0.5);
  push(A4n, 14.5, 0.5);
  push(G4, 15, 0.5);
  push(F4, 15.5, 0.5);
  push(E4, 16, 0.5);
  push(C4, 16.5, 1.5);

  // Telling lies? (C C D E | E D C)
  push(C4, 18, 0.5);
  push(C4, 18.5, 0.5);
  push(D4, 19, 0.5);
  push(E4, 19.5, 0.5);
  push(E4, 20, 0.5);
  push(D4, 20.5, 0.5);
  push(C4, 21, 1.0);

  // No, Papa (G A G F | E C)
  push(G4, 22, 0.5);
  push(A4n, 22.5, 0.5);
  push(G4, 23, 0.5);
  push(F4, 23.5, 0.5);
  push(E4, 24, 0.5);
  push(C4, 24.5, 1.5);

  // Open your mouth (C D E G | E D C)
  push(C4, 26, 0.5);
  push(D4, 26.5, 0.5);
  push(E4, 27, 0.5);
  push(G4, 27.5, 0.5);
  push(E4, 28, 0.5);
  push(D4, 28.5, 0.5);
  push(C4, 29, 1.0);

  // Ha ha ha! (C C C | G E C)
  push(C4, 30, 0.4, 0.22);
  push(C4, 30.6, 0.4, 0.22);
  push(C4, 31.2, 0.8, 0.22);
  push(G4, 32.2, 0.4, 0.22);
  push(E4, 32.8, 0.4, 0.22);
  push(C4, 33.4, 0.8, 0.22);

  const totalDuration = 34.5 * beat;
  return { notes, totalDuration, lyricLines: lines };
}

function pickSupportedMime(): string {
  const options = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/webm;codecs=h264,opus"
  ];
  for (const t of options) {
    // @ts-ignore
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(t)) return t;
  }
  return "video/webm";
}

export default function CartoonSinger() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const recChunksRef = useRef<Blob[]>([]);
  const canvasStreamRef = useRef<MediaStream | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const animReqRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const mouthPulseEventsRef = useRef<number[]>([]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [activeLine, setActiveLine] = useState<number>(-1);
  const [fileSize, setFileSize] = useState<string>("");

  const { notes, totalDuration, lyricLines } = useMemo(buildMelody, []);

  // Compute lyric line from currentTime
  const computeActiveLine = useCallback(
    (t: number) => {
      for (let i = lyricLines.length - 1; i >= 0; i--) {
        const line = lyricLines[i];
        if (t >= line.start && t <= line.start + line.duration + 0.05) {
          return i;
        }
      }
      return -1;
    },
    [lyricLines]
  );

  // Audio scheduling
  const ensureAudio = useCallback(async () => {
    if (!audioCtxRef.current) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 48000
      });
      const master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(ctx.destination);
      const dest = ctx.createMediaStreamDestination();
      master.connect(dest);
      audioCtxRef.current = ctx;
      audioDestRef.current = dest;
      masterGainRef.current = master;
    }
    if (audioCtxRef.current.state !== "running") {
      await audioCtxRef.current.resume();
    }
    return { ctx: audioCtxRef.current!, dest: audioDestRef.current!, master: masterGainRef.current! };
  }, []);

  const scheduleSong = useCallback(
    (offsetStart: number) => {
      const ctx = audioCtxRef.current!;
      const master = masterGainRef.current!;
      mouthPulseEventsRef.current = [];
      // Gentle backing "pad"
      const padOsc = ctx.createOscillator();
      const padGain = ctx.createGain();
      padOsc.type = "sine";
      padOsc.frequency.value = 196; // G3
      padGain.gain.setValueAtTime(0.0001, offsetStart);
      padGain.gain.linearRampToValueAtTime(0.02, offsetStart + 2 * beat);
      padGain.gain.setTargetAtTime(0.0, offsetStart + totalDuration - 1.2, 0.6);
      padOsc.connect(padGain).connect(master);
      padOsc.start(offsetStart);
      padOsc.stop(offsetStart + totalDuration + 1.0);

      for (const n of notes) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.value = n.freq;
        // Subtle vibrato
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.type = "sine";
        lfo.frequency.value = 5.5;
        lfoGain.gain.value = 6; // cents
        lfo.connect(lfoGain);
        lfoGain.connect(osc.detune);
        lfo.start(offsetStart + n.start);
        lfo.stop(offsetStart + n.start + n.duration + 0.05);

        const attack = 0.008;
        const release = 0.06;
        const start = offsetStart + n.start;
        const end = start + n.duration;
        gain.gain.setValueAtTime(0.00001, start);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.00002, n.gain), start + attack);
        gain.gain.setTargetAtTime(0.00001, end - release, 0.03);
        osc.connect(gain).connect(master);
        osc.start(start);
        osc.stop(end + 0.1);

        // Drive mouth pulses at note onset
        mouthPulseEventsRef.current.push(start);
      }
    },
    [notes, totalDuration]
  );

  // Canvas sizing
  useEffect(() => {
    const canvas = canvasRef.current!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      const parent = canvas.parentElement!;
      const rect = parent.getBoundingClientRect();
      const width = Math.floor(rect.width);
      const height = Math.floor(rect.height);
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);
    return () => ro.disconnect();
  }, []);

  // Drawing
  const drawFrame = useCallback(
    (ctx2d: CanvasRenderingContext2D, now: number) => {
      const canvas = ctx2d.canvas;
      const w = canvas.width;
      const h = canvas.height;
      const t = (now - startTimeRef.current) / 1000; // seconds elapsed since start

      // Background gradient
      const g = ctx2d.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#0b1736");
      g.addColorStop(1, "#091026");
      ctx2d.fillStyle = g;
      ctx2d.fillRect(0, 0, w, h);

      // Spotlight
      ctx2d.save();
      ctx2d.globalCompositeOperation = "lighter";
      ctx2d.fillStyle = "rgba(124,195,255,0.10)";
      ctx2d.beginPath();
      ctx2d.ellipse(w * 0.5, h * 0.25, w * 0.45, h * 0.18, 0, 0, Math.PI * 2);
      ctx2d.fill();
      ctx2d.restore();

      // Stage floor
      ctx2d.fillStyle = "#0b1228";
      ctx2d.fillRect(0, h * 0.72, w, h * 0.28);
      ctx2d.fillStyle = "rgba(255,255,255,0.05)";
      ctx2d.fillRect(0, h * 0.72, w, 2);

      // Character position
      const cx = w * 0.5;
      const cy = h * 0.46;
      const headR = Math.min(w, h) * 0.14;

      // Determine lyric line and show on side panel state
      const lineIdx = computeActiveLine(t);
      if (lineIdx !== activeLine) setActiveLine(lineIdx);
      setProgress(Math.min(1, t / totalDuration));

      // Peekaboo state early and playful waves during lines
      const isPeekaboo = t < 2 * beat || (lineIdx === 8 && (t % 0.6) < 0.3);

      // Mouth openness from pulses
      let mouthOpen = 0.12;
      for (const p of mouthPulseEventsRef.current) {
        const dt = (audioCtxRef.current ? audioCtxRef.current.currentTime : t) - p;
        if (dt >= -0.03 && dt < 0.6) {
          const env = Math.max(0, 1 - dt / 0.6);
          mouthOpen = Math.max(mouthOpen, 0.12 + 0.38 * env);
        }
      }
      if (!isPlaying) mouthOpen = 0.08;

      // Gentle bobbing
      const bob = Math.sin(t * 2) * 4;
      const tilt = Math.sin(t * 1.2) * 0.06;

      ctx2d.save();
      ctx2d.translate(cx, cy + bob);
      ctx2d.rotate(tilt);

      // Body
      ctx2d.fillStyle = "#7cc3ff";
      // @ts-ignore - roundRect supported in modern browsers
      ctx2d.beginPath();
      ctx2d.roundRect(-headR * 0.9, headR * 0.9, headR * 1.8, headR * 1.6, 18);
      ctx2d.fill();

      // Neck
      ctx2d.fillStyle = "#ffd3b6";
      ctx2d.fillRect(-headR * 0.25, headR * 0.68, headR * 0.5, headR * 0.35);

      // Head
      ctx2d.fillStyle = "#ffe0c7";
      ctx2d.beginPath();
      ctx2d.arc(0, 0, headR, 0, Math.PI * 2);
      ctx2d.fill();

      // Hair
      ctx2d.fillStyle = "#3b2f2a";
      ctx2d.beginPath();
      ctx2d.ellipse(0, -headR * 0.6, headR * 0.95, headR * 0.65, 0, 0, Math.PI * 2);
      ctx2d.fill();
      ctx2d.fillStyle = "#2d2420";
      ctx2d.beginPath();
      ctx2d.moveTo(-headR * 0.95, -headR * 0.15);
      ctx2d.quadraticCurveTo(0, -headR * 1.25, headR * 0.95, -headR * 0.1);
      ctx2d.lineTo(headR * 0.95, -headR * 0.45);
      ctx2d.quadraticCurveTo(0, -headR * 1.1, -headR * 0.95, -headR * 0.5);
      ctx2d.closePath();
      ctx2d.fill();

      // Eyes
      const blink = ((Math.sin(t * 2.7) + Math.sin(t * 3.13 + 1)) * 0.5) > 0.94 ? 0.1 : 1;
      const eyeOpen = Math.max(0.12, 0.5 * blink);
      const eyeY = -headR * 0.22;
      const eyeRX = headR * 0.46;
      ctx2d.fillStyle = "#fff";
      ctx2d.beginPath();
      ctx2d.ellipse(-eyeRX, eyeY, headR * 0.22, headR * eyeOpen * 0.14, 0, 0, Math.PI * 2);
      ctx2d.fill();
      ctx2d.beginPath();
      ctx2d.ellipse(eyeRX, eyeY, headR * 0.22, headR * eyeOpen * 0.14, 0, 0, Math.PI * 2);
      ctx2d.fill();
      // Pupils
      ctx2d.fillStyle = "#111";
      ctx2d.beginPath();
      ctx2d.arc(-eyeRX, eyeY, headR * 0.07, 0, Math.PI * 2);
      ctx2d.fill();
      ctx2d.beginPath();
      ctx2d.arc(eyeRX, eyeY, headR * 0.07, 0, Math.PI * 2);
      ctx2d.fill();

      // Nose
      ctx2d.fillStyle = "#f5c8a9";
      ctx2d.beginPath();
      ctx2d.arc(0, -headR * 0.02, headR * 0.07, 0, Math.PI * 2);
      ctx2d.fill();

      // Mouth
      const mouthW = headR * 0.6;
      const mouthH = headR * (0.10 + 0.35 * mouthOpen);
      ctx2d.fillStyle = "#9b0f3f";
      ctx2d.beginPath();
      ctx2d.ellipse(0, headR * 0.34, mouthW, mouthH, 0, 0, Math.PI * 2);
      ctx2d.fill();
      // Teeth
      ctx2d.fillStyle = "#fff";
      ctx2d.fillRect(-mouthW * 0.6, headR * 0.28, mouthW * 1.2, Math.max(2, mouthH * 0.25));

      // Hands for peekaboo
      const handsY = -headR * 0.05;
      const handX = headR * 1.05;
      const cover = isPeekaboo ? 1 : 0;
      const coverY = eyeY - headR * 0.04;
      const coverH = headR * 0.4 * (0.2 + 0.8 * cover);
      ctx2d.fillStyle = "#ffe0c7";
      // Left
      ctx2d.save();
      ctx2d.translate(-handX, handsY);
      ctx2d.rotate(-0.3 + 0.3 * cover);
      ctx2d.fillRect(-headR * 0.25, -headR * 0.15, headR * 0.5, headR * 0.6);
      ctx2d.restore();
      // Right
      ctx2d.save();
      ctx2d.translate(handX, handsY);
      ctx2d.rotate(0.3 - 0.3 * cover);
      ctx2d.fillRect(-headR * 0.25, -headR * 0.15, headR * 0.5, headR * 0.6);
      ctx2d.restore();
      // Cover strips across eyes when peekaboo
      if (cover > 0.5) {
        ctx2d.fillStyle = "#ffe0c7";
        ctx2d.fillRect(-eyeRX - headR * 0.28, coverY, headR * 0.56, coverH);
        ctx2d.fillRect(eyeRX - headR * 0.28, coverY, headR * 0.56, coverH);
      }

      ctx2d.restore();

      // Subtle confetti sparkle at the end
      if (t > totalDuration - 2) {
        for (let i = 0; i < 40; i++) {
          const phi = (t * 2 + i) % Math.PI;
          const rx = Math.sin(phi * (i + 1)) * w * 0.45;
          const ry = Math.cos(phi * (i + 3)) * h * 0.18;
          ctx2d.fillStyle = `hsla(${(i * 23) % 360}, 80%, 65%, 0.5)`;
          ctx2d.beginPath();
          ctx2d.arc(w * 0.5 + rx, h * 0.28 + ry, 2 + (i % 3), 0, Math.PI * 2);
          ctx2d.fill();
        }
      }
    },
    [activeLine, computeActiveLine, totalDuration]
  );

  const loop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;
    drawFrame(ctx2d, performance.now());
    animReqRef.current = requestAnimationFrame(loop);
  }, [drawFrame]);

  const stopAll = useCallback(() => {
    if (animReqRef.current) cancelAnimationFrame(animReqRef.current);
    animReqRef.current = null;
    setIsPlaying(false);
    setIsRecording(false);
    // Stop recorder if running
    recorderRef.current?.state === "recording" && recorderRef.current.stop();
    // Stop tracks
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    canvasStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    canvasStreamRef.current = null;
  }, []);

  const startPlayback = useCallback(async () => {
    stopAll();
    const { ctx } = await ensureAudio();
    setVideoUrl(null);
    setFileSize("");
    setIsPlaying(true);
    startTimeRef.current = performance.now();
    const audioStartAt = ctx.currentTime + 0.08;
    scheduleSong(audioStartAt);
    mouthPulseEventsRef.current.push(audioStartAt); // kickstart
    loop();
    // Auto-stop at end
    window.setTimeout(() => {
      stopAll();
    }, (totalDuration + 0.3) * 1000);
  }, [ensureAudio, loop, scheduleSong, stopAll, totalDuration]);

  const startRecording = useCallback(async () => {
    stopAll();
    const { ctx, dest } = await ensureAudio();
    setVideoUrl(null);
    setFileSize("");

    const canvas = canvasRef.current!;
    const stream = (canvas as any).captureStream?.(60) as MediaStream;
    canvasStreamRef.current = stream;
    const combined = new MediaStream([
      ...stream.getVideoTracks(),
      ...dest.stream.getAudioTracks()
    ]);
    mediaStreamRef.current = combined;

    const mimeType = pickSupportedMime();
    const rec = new MediaRecorder(combined, { mimeType, videoBitsPerSecond: 6_000_000 });
    recorderRef.current = rec;
    recChunksRef.current = [];
    rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) recChunksRef.current.push(e.data);
    };
    rec.onstop = () => {
      const blob = new Blob(recChunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setFileSize(`${(blob.size / (1024 * 1024)).toFixed(2)} MB`);
      // Preview
      if (videoRef.current) {
        videoRef.current.src = url;
        videoRef.current.load();
      }
    };

    // Kick everything
    setIsPlaying(true);
    setIsRecording(true);
    startTimeRef.current = performance.now();
    const audioStartAt = ctx.currentTime + 0.12;
    scheduleSong(audioStartAt);
    rec.start(250);
    loop();

    // Auto-stop
    window.setTimeout(() => {
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      stopAll();
    }, (totalDuration + 0.5) * 1000);
  }, [ensureAudio, loop, scheduleSong, stopAll, totalDuration]);

  useEffect(() => {
    return () => {
      stopAll();
      audioCtxRef.current?.close().catch(() => void 0);
    };
  }, [stopAll]);

  return (
    <div className="content">
      <div className="stage" ref={containerRef}>
        <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />
      </div>
      <div className="side">
        <div className="actions" style={{ justifyContent: "flex-start" }}>
          <button className="btn" onClick={startPlayback} disabled={isPlaying && !isRecording}>
            Play Preview
          </button>
          <button className="btn secondary" onClick={startRecording} disabled={isRecording}>
            Record Video
          </button>
          <button className="btn" onClick={stopAll}>
            Stop
          </button>
        </div>

        <div className="lyrics">
          {lyricLines.map((l, i) => (
            <div key={i} className={`lyric-line ${i === activeLine ? "active" : ""}`}>
              {l.text}
            </div>
          ))}
        </div>

        <div className="output">
          <div className="small">Progress: {(progress * 100).toFixed(0)}%</div>
          <video className="preview" ref={videoRef} controls playsInline />
          {videoUrl && (
            <a className="btn" href={videoUrl} download="peekaboo-johny.webm">
              Download ({fileSize})
            </a>
          )}
          <div className="small">
            Tip: Use the Record Video button for a downloadable WebM with audio. Works best in Chrome.
          </div>
        </div>
      </div>
    </div>
  );
}

