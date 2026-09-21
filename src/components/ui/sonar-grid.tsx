import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

export interface SonarGridProps extends React.HTMLAttributes<HTMLDivElement> {
  spacing?: number;
  dotSize?: number;
  dotColor?: string;
  ringColor?: string;
  maxRadius?: number;
  speed?: number;
  ambientInterval?: number;
  enableClick?: boolean;
  enableHover?: boolean;
  children?: React.ReactNode;
}

interface Ring {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  speed: number;
  opacity: number;
  color: string;
}

export const SonarGrid: React.FC<SonarGridProps> = ({
  spacing = 28,
  dotSize = 1.2,
  dotColor,
  ringColor,
  maxRadius = 380,
  speed = 1.6,
  ambientInterval = 4000,
  enableClick = true,
  enableHover = false,
  className,
  children,
  ...props
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ringsRef = useRef<Ring[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const lastAmbientTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // Check system preference for reduced motion
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    // Initial mid-flight ring at first paint
    const rect = container.getBoundingClientRect();
    const initialRingColor = ringColor || 'rgba(37, 99, 235, ';
    ringsRef.current = [
      {
        x: rect.width * 0.5,
        y: rect.height * 0.45,
        radius: Math.min(rect.width, rect.height) * 0.35,
        maxRadius: Math.max(rect.width, rect.height) * 0.75 || maxRadius,
        speed: prefersReducedMotion ? 0.4 : speed,
        opacity: 0.6,
        color: initialRingColor,
      },
    ];

    let dpr = window.devicePixelRatio || 1;
    let width = 0;
    let height = 0;

    const resize = () => {
      if (!container || !canvas) return;
      const bRect = container.getBoundingClientRect();
      width = bRect.width;
      height = bRect.height;
      dpr = window.devicePixelRatio || 1;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.scale(dpr, dpr);
    };

    const resizeObserver = new ResizeObserver(() => {
      resize();
    });
    resizeObserver.observe(container);
    resize();

    const addRing = (x: number, y: number, customMaxRadius?: number) => {
      if (prefersReducedMotion) return;
      const ringMax = customMaxRadius || Math.max(width, height) * 0.65 || maxRadius;
      ringsRef.current.push({
        x,
        y,
        radius: 0,
        maxRadius: ringMax,
        speed: speed,
        opacity: 1,
        color: ringColor || 'rgba(37, 99, 235, ',
      });
    };

    const handleClick = (e: MouseEvent) => {
      if (!enableClick || !container) return;
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      addRing(x, y);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!enableHover || !container) return;
      const now = Date.now();
      if (now - lastAmbientTimeRef.current > 800) {
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        addRing(x, y, 220);
        lastAmbientTimeRef.current = now;
      }
    };

    if (enableClick) {
      container.addEventListener('click', handleClick);
    }
    if (enableHover) {
      container.addEventListener('mousemove', handleMouseMove);
    }

    const isDarkMode = () =>
      document.documentElement.classList.contains('dark');

    const render = () => {
      if (!ctx || width === 0 || height === 0) {
        animationFrameRef.current = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, width, height);

      const dark = isDarkMode();
      const defaultDotColor = dotColor || (dark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(15, 23, 42, 0.10)');
      const activeRingBaseColor = ringColor || (dark ? 'rgba(96, 165, 250, ' : 'rgba(37, 99, 235, ');

      // Ambient sonar pings
      const now = Date.now();
      if (
        !prefersReducedMotion &&
        ambientInterval > 0 &&
        now - lastAmbientTimeRef.current > ambientInterval
      ) {
        const randomX = width * (0.2 + Math.random() * 0.6);
        const randomY = height * (0.2 + Math.random() * 0.6);
        addRing(randomX, randomY);
        lastAmbientTimeRef.current = now;
      }

      // Update and filter active sonar rings
      const rings = ringsRef.current;
      for (let i = rings.length - 1; i >= 0; i--) {
        const ring = rings[i];
        ring.radius += ring.speed;
        const progress = ring.radius / ring.maxRadius;
        ring.opacity = Math.max(0, 1 - Math.pow(progress, 1.2));

        if (ring.radius >= ring.maxRadius || ring.opacity <= 0.01) {
          rings.splice(i, 1);
        }
      }

      // Draw Base Grid of Dots + illuminated wave effects
      const cols = Math.ceil(width / spacing) + 1;
      const rows = Math.ceil(height / spacing) + 1;

      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          const dotX = c * spacing;
          const dotY = r * spacing;

          let dotAlphaBonus = 0;
          let dotRadiusBonus = 0;
          let isIlluminated = false;

          // Check if any expanding ring is intersecting this dot
          for (const ring of rings) {
            const dx = dotX - ring.x;
            const dy = dotY - ring.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const distFromRingEdge = Math.abs(dist - ring.radius);

            // Ring thickness influence
            const ringThickness = 36;
            if (distFromRingEdge < ringThickness) {
              const intensity = (1 - distFromRingEdge / ringThickness) * ring.opacity;
              dotAlphaBonus = Math.max(dotAlphaBonus, intensity);
              dotRadiusBonus = Math.max(dotRadiusBonus, intensity * 1.8);
              isIlluminated = true;
            }
          }

          ctx.beginPath();
          const currentRadius = dotSize + dotRadiusBonus;
          ctx.arc(dotX, dotY, currentRadius, 0, Math.PI * 2);

          if (isIlluminated && dotAlphaBonus > 0.05) {
            ctx.fillStyle = `${activeRingBaseColor}${Math.min(0.9, 0.15 + dotAlphaBonus * 0.75)})`;
          } else {
            ctx.fillStyle = defaultDotColor;
          }
          ctx.fill();
        }
      }

      // Draw faint outer sonar ring strokes for visual echo
      for (const ring of rings) {
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = `${activeRingBaseColor}${ring.opacity * 0.35})`;
        ctx.stroke();

        // Secondary subtle trailing echo
        if (ring.radius > 20) {
          ctx.beginPath();
          ctx.arc(ring.x, ring.y, Math.max(0, ring.radius - 18), 0, Math.PI * 2);
          ctx.lineWidth = 0.8;
          ctx.strokeStyle = `${activeRingBaseColor}${ring.opacity * 0.15})`;
          ctx.stroke();
        }
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      resizeObserver.disconnect();
      if (enableClick) {
        container.removeEventListener('click', handleClick);
      }
      if (enableHover) {
        container.removeEventListener('mousemove', handleMouseMove);
      }
    };
  }, [
    spacing,
    dotSize,
    dotColor,
    ringColor,
    maxRadius,
    speed,
    ambientInterval,
    enableClick,
    enableHover,
  ]);

  return (
    <div
      ref={containerRef}
      className={cn('relative w-full h-full overflow-hidden', className)}
      {...props}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none block z-0"
        aria-hidden="true"
      />
      {children && <div className="relative z-10 w-full h-full">{children}</div>}
    </div>
  );
};

export default SonarGrid;
