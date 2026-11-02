import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Audio,
  staticFile,
  Sequence,
} from 'remotion';

// ── Components ───────────────────────────────────────────────────────────────

const LogoEmblem: React.FC<{ size?: number }> = ({ size = 64 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <rect x="1" y="1" width="30" height="30" rx="8" fill="#141418" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
    <path
      d="M10 11.5C10 9.8 11.8 8.5 14.5 8.5H19C21.2 8.5 22.5 9.8 22.5 11.5C22.5 13.8 20.5 14.8 17.5 15.5L14.5 16.2C11.5 16.9 9.5 18 9.5 20.5C9.5 22.5 11.2 23.5 13.5 23.5H18C20.8 23.5 22.5 22 22.5 20"
      stroke="#ffffff"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="21.5" cy="11" r="2.2" fill="#ff4500" />
    <circle cx="10.5" cy="21" r="2.2" fill="#ff4500" />
  </svg>
);

// ── Act 1: The Dilemma (Frames 0 - 180 / 0s - 6s) ─────────────────────────────
const SceneTheProblem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProgress = spring({ frame, fps, config: { damping: 14, mass: 0.7 } });
  const cardProgress = spring({ frame: frame - 25, fps, config: { damping: 14, mass: 0.8 } });
  const alertPulse = Math.sin(frame * 0.25) * 0.2 + 0.8;

  const opacityOut = interpolate(frame, [155, 180], [1, 0], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ opacity: opacityOut, padding: '100px 140px', justifyContent: 'center' }}>
      <div style={{ transform: `translateY(${(1 - titleProgress) * 40}px)`, opacity: titleProgress }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '8px 16px', borderRadius: 999, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', marginBottom: 24 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', opacity: alertPulse }} />
          <span style={{ fontFamily: 'monospace', fontSize: 16, color: '#ef4444', fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase' }}>
            The Autonomous Agent Vulnerability
          </span>
        </div>

        <h1 style={{ fontSize: 72, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.03em', lineHeight: 1.08, margin: 0 }}>
          AI agents are managing millions.<br />
          <span style={{ color: '#ff4500' }}>Yet developers still give them raw private keys.</span>
        </h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginTop: 48, transform: `translateY(${(1 - cardProgress) * 30}px)`, opacity: cardProgress }}>
        <div style={{ background: '#141418', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 20, padding: 36 }}>
          <div style={{ fontFamily: 'monospace', fontSize: 15, color: '#ef4444', textTransform: 'uppercase', marginBottom: 12 }}>
            Fatal Exploit Vector
          </div>
          <div style={{ fontSize: 26, color: '#ffffff', fontWeight: 600, lineHeight: 1.35 }}>
            A single prompt injection or memory leak drains the entire fund treasury.
          </div>
        </div>

        <div style={{ background: '#141418', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 20, padding: 36 }}>
          <div style={{ fontFamily: 'monospace', fontSize: 15, color: '#8e8e98', textTransform: 'uppercase', marginBottom: 12 }}>
            Human Multi-Chain Friction
          </div>
          <div style={{ fontSize: 26, color: '#ffffff', fontWeight: 600, lineHeight: 1.35 }}>
            Humans still suffer 6-step bridging, wrapping, and destination gas nightmares.
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── Act 2: The Solution (Frames 180 - 360 / 6s - 12s) ─────────────────────────
const SceneTheSolution: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({ frame, fps, config: { damping: 14, mass: 0.7 } });
  const badgeSpring = spring({ frame: frame - 20, fps, config: { damping: 12 } });
  const opacityOut = interpolate(frame, [155, 180], [1, 0], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ opacity: opacityOut, padding: '100px 140px', justifyContent: 'center' }}>
      <div style={{ transform: `scale(${0.92 + enter * 0.08}) translateY(${(1 - enter) * 30}px)`, opacity: enter }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28 }}>
          <LogoEmblem size={56} />
          <span style={{ fontSize: 32, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.02em' }}>StylusSafe</span>
          <span style={{ fontFamily: 'monospace', fontSize: 14, padding: '6px 14px', borderRadius: 999, background: 'rgba(255, 69, 0, 0.1)', color: '#ff4500', border: '1px solid rgba(255, 69, 0, 0.3)' }}>
            YC Crypto RFS 2026/2027
          </span>
        </div>

        <h1 style={{ fontSize: 68, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.03em', lineHeight: 1.1, margin: 0 }}>
          Universal Cross-Chain Intents.<br />
          <span style={{ color: '#10b981' }}>Hardware-Grade Autonomous Agent Firewall.</span>
        </h1>

        <p style={{ fontSize: 24, color: '#8e8e98', marginTop: 24, maxWidth: 1200, lineHeight: 1.5 }}>
          Root human sovereignty via Apple FaceID / Secure Enclave (<span style={{ fontFamily: 'monospace', color: '#10b981' }}>RIP-7212 precompile 0x100</span> at ~3,450 gas), while autonomous AI bots trade under mathematically enforced on-chain spending limits.
        </p>

        <div style={{ display: 'flex', gap: 24, marginTop: 40, transform: `translateY(${(1 - badgeSpring) * 20}px)`, opacity: badgeSpring }}>
          <div style={{ background: '#141418', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 14, padding: '18px 28px' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#ffffff', fontFamily: 'monospace' }}>1 Touch</div>
            <div style={{ fontSize: 14, color: '#8e8e98', marginTop: 4 }}>Biometric Passkey Root</div>
          </div>
          <div style={{ background: '#141418', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 14, padding: '18px 28px' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#ff4500', fontFamily: 'monospace' }}>$500/day</div>
            <div style={{ fontSize: 14, color: '#8e8e98', marginTop: 4 }}>Agent Spending Cap</div>
          </div>
          <div style={{ background: '#141418', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 14, padding: '18px 28px' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#10b981', fontFamily: 'monospace' }}>$0.00 Gas</div>
            <div style={{ fontSize: 14, color: '#8e8e98', marginTop: 4 }}>ERC-4337 Sponsored</div>
          </div>
        </div>

      </div>
    </AbsoluteFill>
  );
};

// ── Act 3: 1-Click Cross-Chain Swap (Frames 360 - 540 / 12s - 18s) ───────────
const SceneCrossSwap: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({ frame, fps, config: { damping: 14, mass: 0.8 } });
  const swapFill = interpolate(frame, [40, 110], [0, 500], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const isSettled = frame > 110;
  const opacityOut = interpolate(frame, [155, 180], [1, 0], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ opacity: opacityOut, padding: '100px 140px', justifyContent: 'center' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 60, alignItems: 'center', opacity: enter, transform: `translateY(${(1 - enter) * 30}px)` }}>
        
        <div>
          <span style={{ fontFamily: 'monospace', fontSize: 14, color: '#ff4500', textTransform: 'uppercase', letterSpacing: 2 }}>
            Pillar I • Instant Cross-Chain Intent
          </span>
          <h2 style={{ fontSize: 56, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', lineHeight: 1.15, marginTop: 12 }}>
            Swap any token across chains in a single touch.
          </h2>
          <p style={{ fontSize: 20, color: '#8e8e98', lineHeight: 1.5, marginTop: 20 }}>
            No bridge interfaces. No wrapping tokens. No destination gas funding. Collapsed into a single gasless UserOperation.
          </p>
        </div>

        {/* Live Terminal Widget */}
        <div style={{ background: '#141418', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: 36, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: 14, color: '#8e8e98', fontFamily: 'monospace' }}>ROUTING: LIFI DIAMOND</span>
            <span style={{ fontSize: 13, color: '#10b981', fontFamily: 'monospace', fontWeight: 600 }}>SPONSORED GAS ($0.00)</span>
          </div>

          <div style={{ background: '#0d0d10', borderRadius: 16, padding: 20, marginTop: 20, border: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ fontSize: 13, color: '#8e8e98', display: 'flex', justifyContent: 'space-between' }}>
              <span>You Pay</span>
              <span>Arbitrum Sepolia</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <span style={{ fontSize: 40, fontWeight: 700, color: '#ffffff', fontFamily: 'monospace' }}>
                {swapFill.toFixed(0)}
              </span>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#10b981', fontFamily: 'monospace', background: '#141418', padding: '6px 14px', borderRadius: 8 }}>
                USDG
              </span>
            </div>
          </div>

          <div style={{ textAlign: 'center', margin: '-10px 0', zIndex: 10, position: 'relative' }}>
            <span style={{ width: 32, height: 32, borderRadius: '50%', background: '#1b1b21', border: '1px solid rgba(255,255,255,0.1)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#ff4500' }}>
              ↓
            </span>
          </div>

          <div style={{ background: '#0d0d10', borderRadius: 16, padding: 20, border: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ fontSize: 13, color: '#8e8e98', display: 'flex', justifyContent: 'space-between' }}>
              <span>You Receive</span>
              <span>Base (Optimism Superchain)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <span style={{ fontSize: 40, fontWeight: 700, color: '#ffffff', fontFamily: 'monospace' }}>
                {(swapFill * 0.998).toFixed(2)}
              </span>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#0052ff', fontFamily: 'monospace', background: '#141418', padding: '6px 14px', borderRadius: 8 }}>
                USDC
              </span>
            </div>
          </div>

          <div style={{ marginTop: 24, padding: '16px', borderRadius: 12, background: isSettled ? 'rgba(16, 185, 129, 0.1)' : '#ff4500', color: '#ffffff', textAlign: 'center', fontWeight: 700, fontSize: 16, fontFamily: 'monospace' }}>
            {isSettled ? '✔ ATOMIC SETTLEMENT CONFIRMED • 3.2s' : '⚡ EXECUTING INTENT VIA WEBAUTHN...'}
          </div>
        </div>

      </div>
    </AbsoluteFill>
  );
};

// ── Act 4: On-Chain Agent Firewall (Frames 540 - 720 / 18s - 24s) ─────────────
const SceneFirewall: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({ frame, fps, config: { damping: 14, mass: 0.8 } });
  const isBlocked = frame > 80;
  const opacityOut = interpolate(frame, [155, 180], [1, 0], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ opacity: opacityOut, padding: '100px 140px', justifyContent: 'center' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 60, alignItems: 'center', opacity: enter, transform: `translateY(${(1 - enter) * 30}px)` }}>
        
        <div>
          <span style={{ fontFamily: 'monospace', fontSize: 14, color: '#10b981', textTransform: 'uppercase', letterSpacing: 2 }}>
            Pillar II • Agent Spending Firewall
          </span>
          <h2 style={{ fontSize: 56, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', lineHeight: 1.15, marginTop: 12 }}>
            Let AI bots trade.<br />Never lose the treasury.
          </h2>
          <p style={{ fontSize: 20, color: '#8e8e98', lineHeight: 1.5, marginTop: 20 }}>
            Zero-trust on-chain enforcement. Rolling 24h spend ceilings, per-tx caps, and protocol target allowlists. Reverts on-chain before execution.
          </p>
        </div>

        {/* Live Terminal Widget */}
        <div style={{ background: '#141418', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: 36, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: 14, color: '#8e8e98', fontFamily: 'monospace' }}>AGENT: ELIZAOS / GOAT-SDK</span>
            <span style={{ fontSize: 13, color: '#ff4500', fontFamily: 'monospace', fontWeight: 600 }}>PANIC REVOKE ARMED</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 20 }}>
            <div style={{ background: '#0d0d10', borderRadius: 14, padding: 16, border: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ fontSize: 12, color: '#8e8e98', fontFamily: 'monospace' }}>DAILY LIMIT</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#10b981', fontFamily: 'monospace', marginTop: 4 }}>$500.00</div>
            </div>
            <div style={{ background: '#0d0d10', borderRadius: 14, padding: 16, border: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ fontSize: 12, color: '#8e8e98', fontFamily: 'monospace' }}>TARGET WHITELIST</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#ffffff', fontFamily: 'monospace', marginTop: 4 }}>Uniswap V3</div>
            </div>
          </div>

          {/* Adversarial Attempt Simulator */}
          <div style={{ marginTop: 20, background: '#0d0d10', borderRadius: 16, padding: 20, border: isBlocked ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 12, color: '#8e8e98', fontFamily: 'monospace' }}>ADVERSARIAL PROMPT INJECTION TEST</div>
            <div style={{ fontSize: 16, color: '#ffffff', fontFamily: 'monospace', marginTop: 6 }}>
              Bot attempts: <span style={{ color: '#ef4444' }}>Transfer $10,000 USDG to Unverified Target</span>
            </div>

            <div style={{ marginTop: 12, fontSize: 14, fontFamily: 'monospace', color: isBlocked ? '#ef4444' : '#8e8e98', fontWeight: 600 }}>
              {isBlocked ? '✖ REVERT: StylusSafe__AgentDailyLimitExceeded(spent=0, req=10000, cap=500)' : 'Simulating execution...'}
            </div>
          </div>

          <div style={{ marginTop: 20, display: 'flex', gap: 16 }}>
            <div style={{ flex: 1, padding: 14, borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', textAlign: 'center', fontSize: 14, fontWeight: 700, fontFamily: 'monospace' }}>
              1-CLICK HARDWARE PANIC KILLSWITCH
            </div>
          </div>
        </div>

      </div>
    </AbsoluteFill>
  );
};

// ── Act 5: Live Proofs & YC W27 Outro (Frames 720 - 900 / 24s - 30s) ─────────
const SceneOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({ frame, fps, config: { damping: 14, mass: 0.8 } });

  return (
    <AbsoluteFill style={{ padding: '80px 140px', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
      <div style={{ opacity: enter, transform: `scale(${0.92 + enter * 0.08})`, maxWidth: 1100 }}>
        
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <LogoEmblem size={64} />
          <span style={{ fontSize: 44, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>StylusSafe</span>
        </div>

        <h1 style={{ fontSize: 56, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.03em', lineHeight: 1.15, margin: 0 }}>
          The Operating System for On-Chain Agents &amp; Cross-Chain Capital.
        </h1>

        {/* Live Deployments Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginTop: 40, fontFamily: 'monospace', fontSize: 13, textAlign: 'left' }}>
          <div style={{ background: '#141418', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }}>
            <div style={{ color: '#8e8e98' }}>FACTORY (CREATE2)</div>
            <div style={{ color: '#ffffff', fontWeight: 600, marginTop: 4 }}>0xd364...33f7</div>
          </div>
          <div style={{ background: '#141418', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }}>
            <div style={{ color: '#8e8e98' }}>ACCOUNT V2</div>
            <div style={{ color: '#ffffff', fontWeight: 600, marginTop: 4 }}>0x0D66...32fA</div>
          </div>
          <div style={{ background: '#141418', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }}>
            <div style={{ color: '#8e8e98' }}>USDG TREASURY</div>
            <div style={{ color: '#ffffff', fontWeight: 600, marginTop: 4 }}>0xDa4D...BD36</div>
          </div>
          <div style={{ background: '#141418', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 12, padding: 16 }}>
            <div style={{ color: '#10b981' }}>INVARIANTS TESTED</div>
            <div style={{ color: '#10b981', fontWeight: 700, marginTop: 4 }}>15 / 15 PASSED</div>
          </div>
        </div>

        {/* YC Pitch Sign-off */}
        <div style={{ marginTop: 48, padding: '24px 36px', borderRadius: 16, background: '#141418', border: '1px solid rgba(255, 69, 0, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#ffffff' }}>Founder: Olaosebikan Ayomi</div>
            <div style={{ fontSize: 14, color: '#8e8e98', fontFamily: 'monospace', marginTop: 2 }}>
              Applying to Y Combinator Winter 2027
            </div>
          </div>

          <div style={{ textAlign: 'right', fontFamily: 'monospace' }}>
            <div style={{ fontSize: 18, color: '#ff4500', fontWeight: 700 }}>stylussafe.xyz</div>
            <div style={{ fontSize: 13, color: '#8e8e98' }}>github.com/githoboman/StylusSafe</div>
          </div>
        </div>

      </div>
    </AbsoluteFill>
  );
};

// ── Root Composition ─────────────────────────────────────────────────────────
export const StylusSafePitch: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#09090b', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Background Audio with Smooth In/Out Fades */}
      <Audio
        src={staticFile('track.mp3')}
        volume={(f) =>
          interpolate(f, [0, 30, 850, 900], [0, 0.5, 0.5, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })
        }
      />

      <Sequence from={0} durationInFrames={180}>
        <SceneTheProblem />
      </Sequence>

      <Sequence from={180} durationInFrames={180}>
        <SceneTheSolution />
      </Sequence>

      <Sequence from={360} durationInFrames={180}>
        <SceneCrossSwap />
      </Sequence>

      <Sequence from={540} durationInFrames={180}>
        <SceneFirewall />
      </Sequence>

      <Sequence from={720} durationInFrames={180}>
        <SceneOutro />
      </Sequence>
    </AbsoluteFill>
  );
};

