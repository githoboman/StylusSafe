'use client';

import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';

interface SceneTimestamp {
  label: string;
  time: number;
  badge: string;
}

const SCENES: SceneTimestamp[] = [
  { label: 'Seed & Key Risk', time: 0, badge: '0:00' },
  { label: 'StylusSafe v3', time: 10, badge: '0:10' },
  { label: 'RIP-7212 Passkeys', time: 20, badge: '0:20' },
  { label: '$1,000 USDG + $0 Gas', time: 32, badge: '0:32' },
  { label: '3D Agent Firewall', time: 44, badge: '0:44' },
  { label: 'Multi-Policy ERC-7579', time: 58, badge: '0:58' },
  { label: 'Live SwapPool', time: 71, badge: '1:11' },
];

export const VideoPlayerSection: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(90);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const jumpToTime = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = seconds;
    if (!isPlaying) {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      if (videoRef.current.duration) {
        setDuration(videoRef.current.duration);
      }
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="w-full bg-[#0d0d10] border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl">
      {/* Top Header Strip */}
      <div className="px-6 py-4 border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-4 bg-[#141418]">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ff4500] animate-pulse" />
          <h3 className="text-sm font-semibold text-white tracking-tight">
            Cinematic Architecture &amp; Live Proofs Video
          </h3>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/[0.06] text-[#8e8e98] border border-white/[0.08]">
            Remotion 1080p • 30s
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#8e8e98] font-mono">
            Founder: <strong className="text-white">Olaosebikan Ayomi</strong>
          </span>
        </div>
      </div>

      {/* Video Viewport Container */}
      <div className="relative aspect-video w-full bg-black group overflow-hidden">
        <video
          ref={videoRef}
          src="/stylussafe-pitch.mp4"
          poster="/thumbnail.jpg"
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setIsPlaying(false)}
          onClick={togglePlay}
          className="w-full h-full object-contain cursor-pointer"
          playsInline
        />

        {/* Big Center Play Overlay Button (Visible when paused) */}
        {!isPlaying && (
          <div
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] cursor-pointer transition-all hover:bg-black/30"
          >
            <motion.div
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              className="w-18 h-18 rounded-full bg-[#ff4500] text-white flex items-center justify-center shadow-2xl pl-1 border border-white/20"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </motion.div>
          </div>
        )}

        {/* Video Scrubber & Floating Quick Controls (Visible on hover) */}
        <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col gap-2.5 opacity-90 transition-opacity">
          {/* Progress Bar */}
          <div
            onClick={(e) => {
              if (!videoRef.current) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const pos = (e.clientX - rect.left) / rect.width;
              videoRef.current.currentTime = pos * duration;
            }}
            className="w-full h-1.5 bg-white/20 hover:h-2.5 rounded-full cursor-pointer relative transition-all"
          >
            <div
              style={{ width: `${progressPercent}%` }}
              className="h-full bg-[#ff4500] rounded-full relative"
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow" />
            </div>
          </div>

          {/* Controls Bar */}
          <div className="flex items-center justify-between text-xs font-mono text-[#8e8e98]">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={togglePlay}
                className="text-white hover:text-[#ff4500] transition-colors"
              >
                {isPlaying ? 'PAUSE' : 'PLAY'}
              </button>
              <button
                type="button"
                onClick={toggleMute}
                className="text-white hover:text-[#ff4500] transition-colors"
              >
                {isMuted ? 'UNMUTE' : 'MUTE'}
              </button>
              <span>
                {Math.floor(currentTime)}s / {Math.floor(duration)}s
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-zinc-400">Arbitrum Stylus · Paxos USDG</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Scene Jumper Pill Navigation */}
      <div className="p-4 bg-[#141418] border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-2.5">
        <span className="text-xs font-mono text-[#8e8e98] uppercase tracking-wider">
          Jump to Scene:
        </span>
        <div className="flex flex-wrap gap-2">
          {SCENES.map((scene, idx) => {
            const isActive = currentTime >= scene.time && (idx === SCENES.length - 1 || currentTime < SCENES[idx + 1].time);
            return (
              <button
                key={scene.label}
                type="button"
                onClick={() => jumpToTime(scene.time)}
                className={`text-xs px-3 py-1.5 rounded-md font-mono transition-all flex items-center gap-1.5 border ${
                  isActive
                    ? 'bg-[#ff4500] text-white border-[#ff4500] shadow-sm'
                    : 'bg-[#0d0d10] text-[#8e8e98] hover:text-white border-white/[0.08] hover:border-white/[0.15]'
                }`}
              >
                <span className="opacity-70">{scene.time}s</span>
                <span className="font-semibold">{scene.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

