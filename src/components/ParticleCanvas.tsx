import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  size: number;
  shape: 'dash' | 'dot' | 'spark';
  color: string;
  opacity: number;
  rotation: number;
  rotationSpeed: number;
  phase: number;
  speed: number;
  depth: number;
}

// Exact copy from sparkaijobs.com particles.js
export default function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationIdRef = useRef<number | null>(null);
  const isRunningRef = useRef(false);

  const config = {
    colors: [
      { color: '#FF6B35', weight: 45 },  // Orange
      { color: '#E53935', weight: 30 },  // Red
      { color: '#FBBF24', weight: 15 },  // Yellow
      { color: '#A855F7', weight: 10 }   // Purple
    ],
    shapes: ['dash', 'dot', 'spark'] as const,
    minSize: 6,
    maxSize: 24,
    minOpacity: 0.35,
    maxOpacity: 0.6,
    speedFactor: 0.3,
    driftAmplitudeY: 80,
    driftAmplitudeX: 40
  };

  const getParticleCount = () => {
    const width = window.innerWidth;
    if (width < 768) return 15;
    if (width < 1024) return 20;
    return 30;
  };

  const getWeightedColor = () => {
    const totalWeight = config.colors.reduce((sum, c) => sum + c.weight, 0);
    let random = Math.random() * totalWeight;
    for (const { color, weight } of config.colors) {
      random -= weight;
      if (random <= 0) return color;
    }
    return config.colors[0].color;
  };

  const getRandomShape = () => {
    const shapes = config.shapes;
    const index = Math.floor(Math.random() * shapes.length);
    return shapes[index];
  };

  const createParticle = (width: number, height: number): Particle => {
    const shape = getRandomShape();
    const size = config.minSize + Math.random() * (config.maxSize - config.minSize);

    // Distribution: 60% right side, 40% left side, sparse center
    let x: number;
    const distribution = Math.random();
    if (distribution < 0.6) {
      x = width * 0.6 + Math.random() * width * 0.4;
    } else {
      x = Math.random() * width * 0.4;
    }

    return {
      x: x,
      y: Math.random() * height,
      baseX: x,
      baseY: Math.random() * height,
      size: size,
      shape: shape,
      color: getWeightedColor(),
      opacity: config.minOpacity + Math.random() * (config.maxOpacity - config.minOpacity),
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.02,
      phase: Math.random() * Math.PI * 2,
      speed: 0.5 + Math.random() * 1.5,
      depth: 0.5 + Math.random() * 0.5
    };
  };

  const drawDash = (ctx: CanvasRenderingContext2D, particle: Particle) => {
    const { x, y, size, color, opacity, rotation } = particle;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = color;
    ctx.lineWidth = size / 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-size / 2, 0);
    ctx.lineTo(size / 2, 0);
    ctx.stroke();
    ctx.restore();
  };

  const drawDot = (ctx: CanvasRenderingContext2D, particle: Particle) => {
    const { x, y, size, color, opacity } = particle;
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, size / 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const drawSpark = (ctx: CanvasRenderingContext2D, particle: Particle) => {
    const { x, y, size, color, opacity, rotation } = particle;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = color;
    ctx.lineWidth = size / 8;
    ctx.lineCap = 'round';

    const armLength = size / 2;
    const smallArmLength = size / 3;

    // Main arms
    ctx.beginPath();
    ctx.moveTo(0, -armLength);
    ctx.lineTo(0, armLength);
    ctx.moveTo(-armLength, 0);
    ctx.lineTo(armLength, 0);
    ctx.stroke();

    // Diagonal arms (smaller)
    ctx.beginPath();
    ctx.moveTo(-smallArmLength * 0.7, -smallArmLength * 0.7);
    ctx.lineTo(smallArmLength * 0.7, smallArmLength * 0.7);
    ctx.moveTo(smallArmLength * 0.7, -smallArmLength * 0.7);
    ctx.lineTo(-smallArmLength * 0.7, smallArmLength * 0.7);
    ctx.stroke();

    ctx.restore();
  };

  const drawParticle = (ctx: CanvasRenderingContext2D, particle: Particle) => {
    switch (particle.shape) {
      case 'dash':
        drawDash(ctx, particle);
        break;
      case 'dot':
        drawDot(ctx, particle);
        break;
      case 'spark':
        drawSpark(ctx, particle);
        break;
    }
  };

  const updateParticle = (particle: Particle, time: number, width: number, height: number) => {
    const timeScale = time * 0.001 * config.speedFactor * particle.speed;

    // Vertical drift with parallax
    particle.y = particle.baseY +
      Math.sin(timeScale + particle.phase) * config.driftAmplitudeY * particle.depth;

    // Horizontal drift (smaller)
    particle.x = particle.baseX +
      Math.cos(timeScale * 0.7 + particle.phase) * config.driftAmplitudeX * particle.depth;

    // Continuous rotation
    particle.rotation += particle.rotationSpeed * particle.depth;

    // Wrap around
    if (particle.y < -particle.size) {
      particle.baseY = height + particle.size;
      particle.y = particle.baseY;
    } else if (particle.y > height + particle.size) {
      particle.baseY = -particle.size;
      particle.y = particle.baseY;
    }

    if (particle.x < -particle.size) {
      particle.baseX = width + particle.size;
      particle.x = particle.baseX;
    } else if (particle.x > width + particle.size) {
      particle.baseX = -particle.size;
      particle.x = particle.baseX;
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.scale(dpr, dpr);

      return { width: rect.width, height: rect.height };
    };

    const createParticles = (width: number, height: number) => {
      particlesRef.current = [];
      const count = getParticleCount();
      for (let i = 0; i < count; i++) {
        particlesRef.current.push(createParticle(width, height));
      }
    };

    const animate = (time: number) => {
      if (!isRunningRef.current) return;

      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;

      const width = rect.width;
      const height = rect.height;

      ctx.clearRect(0, 0, width, height);

      for (const particle of particlesRef.current) {
        updateParticle(particle, time, width, height);
        drawParticle(ctx, particle);
      }

      animationIdRef.current = requestAnimationFrame(animate);
    };

    const start = () => {
      if (isRunningRef.current) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      isRunningRef.current = true;
      animationIdRef.current = requestAnimationFrame(animate);
    };

    const stop = () => {
      isRunningRef.current = false;
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
    };

    // Initialize
    const size = resizeCanvas();
    if (size) {
      createParticles(size.width, size.height);
      start();

      // Fade in the canvas
      setTimeout(() => {
        canvas.classList.add('fade-in');
      }, 100);
    }

    // Resize handler
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const size = resizeCanvas();
        if (size) {
          createParticles(size.width, size.height);
        }
      }, 250);
    };

    window.addEventListener('resize', handleResize);

    // Visibility handler
    const handleVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        start();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stop();
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="particle-canvas"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1,
        pointerEvents: 'none',
        opacity: 0,
        transition: 'opacity 3s ease-in-out',
      }}
    />
  );
}
