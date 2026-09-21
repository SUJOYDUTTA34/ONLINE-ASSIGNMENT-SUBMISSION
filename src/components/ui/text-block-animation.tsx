import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

export interface TextBlockAnimationProps {
  children?: React.ReactNode;
  text?: string | string[];
  blockColor?: string;
  textColor?: string;
  duration?: number;
  delay?: number;
  stagger?: number;
  direction?: 'left-to-right' | 'right-to-left' | 'top-to-bottom';
  className?: string;
  textClassName?: string;
  as?: React.ElementType;
  triggerOnView?: boolean;
  repeat?: boolean;
  onComplete?: () => void;
}

export const TextBlockAnimation: React.FC<TextBlockAnimationProps> = ({
  children,
  text,
  blockColor = '#2563eb', // Default elegant blue
  textColor,
  duration = 0.65,
  delay = 0.1,
  stagger = 0.18,
  direction = 'left-to-right',
  className = '',
  textClassName = '',
  as: Component = 'div',
  triggerOnView = true,
  repeat = false,
  onComplete,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Extract lines from text or children
  const lines: string[] = React.useMemo(() => {
    if (Array.isArray(text)) return text;
    if (typeof text === 'string') return text.split('\n');
    if (typeof children === 'string') return children.split('\n');
    return [];
  }, [text, children]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const blockElements = el.querySelectorAll<HTMLElement>('.tba-block');
    const textElements = el.querySelectorAll<HTMLElement>('.tba-text');

    if (blockElements.length === 0 || textElements.length === 0) return;

    // Reset initial states
    gsap.set(textElements, { opacity: 0 });

    const ctx = gsap.context(() => {
      const runAnimation = () => {
        const tl = gsap.timeline({
          delay,
          onComplete: () => {
            if (onComplete) onComplete();
          },
        });

        lines.forEach((_, index) => {
          const block = blockElements[index];
          const txt = textElements[index];
          if (!block || !txt) return;

          const lineDelay = index * stagger;

          if (direction === 'left-to-right') {
            // Step 1: Block enters from left to right (scaleX 0 -> 1 from left)
            gsap.set(block, { transformOrigin: 'left center', scaleX: 0, opacity: 1 });
            
            tl.to(
              block,
              {
                scaleX: 1,
                duration: duration * 0.6,
                ease: 'power2.inOut',
              },
              lineDelay
            )
              // Step 2: As block is covering text, text becomes visible
              .set(txt, { opacity: 1 }, lineDelay + duration * 0.58)
              // Step 3: Block exits to the right (scaleX 1 -> 0 from right)
              .set(block, { transformOrigin: 'right center' }, lineDelay + duration * 0.6)
              .to(
                block,
                {
                  scaleX: 0,
                  duration: duration * 0.55,
                  ease: 'power2.inOut',
                },
                lineDelay + duration * 0.6
              );
          } else if (direction === 'right-to-left') {
            gsap.set(block, { transformOrigin: 'right center', scaleX: 0, opacity: 1 });
            tl.to(
              block,
              {
                scaleX: 1,
                duration: duration * 0.6,
                ease: 'power2.inOut',
              },
              lineDelay
            )
              .set(txt, { opacity: 1 }, lineDelay + duration * 0.58)
              .set(block, { transformOrigin: 'left center' }, lineDelay + duration * 0.6)
              .to(
                block,
                {
                  scaleX: 0,
                  duration: duration * 0.55,
                  ease: 'power2.inOut',
                },
                lineDelay + duration * 0.6
              );
          } else {
            // Top to bottom
            gsap.set(block, { transformOrigin: 'top center', scaleY: 0, opacity: 1 });
            tl.to(
              block,
              {
                scaleY: 1,
                duration: duration * 0.6,
                ease: 'power2.inOut',
              },
              lineDelay
            )
              .set(txt, { opacity: 1 }, lineDelay + duration * 0.58)
              .set(block, { transformOrigin: 'bottom center' }, lineDelay + duration * 0.6)
              .to(
                block,
                {
                  scaleY: 0,
                  duration: duration * 0.55,
                  ease: 'power2.inOut',
                },
                lineDelay + duration * 0.6
              );
          }
        });
      };

      if (triggerOnView && 'IntersectionObserver' in window) {
        let hasTriggered = false;
        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting && (!hasTriggered || repeat)) {
                hasTriggered = true;
                runAnimation();
                if (!repeat) {
                  observer.disconnect();
                }
              }
            });
          },
          { threshold: 0.15 }
        );
        observer.observe(el);
      } else {
        runAnimation();
      }
    }, containerRef);

    return () => ctx.revert();
  }, [lines, blockColor, duration, delay, stagger, direction, triggerOnView, repeat, onComplete]);

  if (lines.length === 0 && children) {
    return (
      <Component ref={containerRef as any} className={`relative inline-block ${className}`}>
        <div className="relative inline-block overflow-hidden">
          <div className="tba-text" style={{ color: textColor }}>
            {children}
          </div>
          <div
            className="tba-block absolute inset-0 pointer-events-none z-10"
            style={{ backgroundColor: blockColor }}
          />
        </div>
      </Component>
    );
  }

  return (
    <Component ref={containerRef as any} className={`flex flex-col gap-1.5 ${className}`}>
      {lines.map((line, idx) => (
        <div key={idx} className="relative inline-block overflow-hidden self-start max-w-full">
          <span
            className={`tba-text inline-block ${textClassName}`}
            style={{ color: textColor }}
          >
            {line}
          </span>
          <div
            className="tba-block absolute inset-0 pointer-events-none z-10"
            style={{ backgroundColor: blockColor }}
          />
        </div>
      ))}
    </Component>
  );
};

export default TextBlockAnimation;
