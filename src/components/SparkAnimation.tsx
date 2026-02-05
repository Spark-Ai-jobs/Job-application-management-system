import { useEffect, useState, useRef } from 'react';
import '../styles/spark-animation.css';

interface SparkAnimationProps {
  onComplete?: () => void;
  showTagline?: boolean;
  tagline?: string;
  duration?: number;
}

export default function SparkAnimation({
  onComplete,
  showTagline = false,
  tagline = 'AI-Powered Job Application Management',
  duration = 3500,
}: SparkAnimationProps) {
  const [isTextVisible, setIsTextVisible] = useState(false);
  const [isLightning, setIsLightning] = useState(false);
  const [animateStar, setAnimateStar] = useState(false);
  const [starLanded, setStarLanded] = useState(false);
  const [showTaglineState, setShowTaglineState] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Sound effects
  const playLightningSound = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const t = ctx.currentTime;

      // Deep bass rumble
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(50, t);
      osc.frequency.exponentialRampToValueAtTime(20, t + 1.0);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(300, t);
      filter.frequency.exponentialRampToValueAtTime(50, t + 0.5);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.0);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 1.0);
    } catch (e) {
      // Audio not supported
    }
  };

  const playChimeSound = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const t = ctx.currentTime;

      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(400, t);
      osc.frequency.exponentialRampToValueAtTime(800, t + 0.1);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.2, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 1.5);
    } catch (e) {
      // Audio not supported
    }
  };

  useEffect(() => {
    // Animation sequence
    const timers: NodeJS.Timeout[] = [];

    // Step 1: Show text
    timers.push(setTimeout(() => {
      setIsTextVisible(true);
    }, 200));

    // Step 2: Lightning effect
    timers.push(setTimeout(() => {
      setIsLightning(true);
      playLightningSound();
    }, 400));

    // Step 3: Stop lightning
    timers.push(setTimeout(() => {
      setIsLightning(false);
    }, 1800));

    // Step 4: Animate star
    timers.push(setTimeout(() => {
      setAnimateStar(true);
      playChimeSound();
    }, 600));

    // Step 5: Star landed
    timers.push(setTimeout(() => {
      setStarLanded(true);
    }, 1800));

    // Step 6: Show tagline
    if (showTagline) {
      timers.push(setTimeout(() => {
        setShowTaglineState(true);
      }, 2200));
    }

    // Step 7: Fade out and complete
    timers.push(setTimeout(() => {
      setFadeOut(true);
    }, duration - 800));

    timers.push(setTimeout(() => {
      onComplete?.();
    }, duration));

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [duration, onComplete, showTagline]);

  // Generate particles
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: Math.random() * 100,
    delay: Math.random() * 2,
    size: 2 + Math.random() * 4,
  }));

  return (
    <div className={`spark-animation-container ${fadeOut ? 'fade-out' : ''}`}>
      {/* Particles */}
      <div className="spark-particles">
        {particles.map((p) => (
          <div
            key={p.id}
            className="spark-particle"
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: p.size,
              height: p.size,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Brand Animation */}
      <div style={{ textAlign: 'center', position: 'relative', zIndex: 10 }}>
        <div className={`spark-brand ${animateStar ? 'animate-star' : ''} ${starLanded ? 'star-landed' : ''}`}>
          <div className="spark-brand-wrapper">
            <span className={`spark-brand-text ${isTextVisible ? 'visible' : ''} ${isLightning ? 'spark-active' : ''}`}>
              Spark.A
              <span className="dotless-i">
                ı
                <span className="star-dot"></span>
              </span>
            </span>
            <svg className="spark-brand-arrow" viewBox="0 0 100 35" preserveAspectRatio="none">
              <path
                d="M0,15 C0,15 25,32 50,32 C75,32 88,18 88,18 L97,10 L86,18 C86,18 72,28 50,28 C28,28 5,14 5,14 Z"
                fill="#FF9900"
              />
            </svg>
            <span className="sliding-star"></span>
          </div>
        </div>

        {showTagline && (
          <p className={`spark-tagline ${showTaglineState ? 'visible' : ''}`}>
            {tagline}
          </p>
        )}
      </div>
    </div>
  );
}
