"use client";

import { PasswordStrength } from "@/components/ui/password-strength";
import { AuthForm } from "@/components/ui/premium-auth";
import { TextBlockAnimation } from "@/components/ui/text-block-animation";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SonarGrid } from "@/components/ui/sonar-grid";
import { ShinyButton } from "@/components/ui/shiny-button";
import { InputModal } from "@/components/ui/input-modal";
import { Button } from "@/components/ui/button";
import { useId, useState } from "react";
import { ArrowRight, Sparkles, UserPlus, LogIn } from "lucide-react";

export function DemoOne() {
  return <AuthForm />;
}

export function ShinyButtonDemo() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 p-8 bg-slate-100 dark:bg-slate-900 rounded-2xl">
      <ShinyButton variant="primary" icon={<Sparkles className="w-4 h-4" />}>
        Shiny Button
      </ShinyButton>
      <ShinyButton variant="dark" icon={<UserPlus className="w-4 h-4" />}>
        Create Account
      </ShinyButton>
      <ShinyButton variant="outline" icon={<LogIn className="w-4 h-4" />}>
        Sign In
      </ShinyButton>
      <ShinyButton variant="emerald" icon={<ArrowRight className="w-4 h-4" />} iconPosition="right">
        Get Started
      </ShinyButton>
    </div>
  );
}

export function SonarGridDemo() {
  return (
    <div className="w-full max-w-2xl mx-auto rounded-3xl border border-neutral-200 dark:border-neutral-800 overflow-hidden bg-slate-50 dark:bg-slate-950">
      <SonarGrid
        spacing={26}
        dotSize={1.3}
        enableClick
        enableHover
        className="h-72 flex items-center justify-center p-6 text-center"
      >
        <div className="max-w-md mx-auto space-y-2 select-none pointer-events-none">
          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-semibold bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            Interactive Dot-Grid Canvas
          </span>
          <h3 className="text-xl font-black text-neutral-900 dark:text-white">
            Click or Move Anywhere
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
            Expanding sonar wave rings with illuminated dot grid intersections and ambient pings.
          </p>
        </div>
      </SonarGrid>
    </div>
  );
}

export function ProgressBarDemo() {
  const [progress, setProgress] = useState(65);

  return (
    <div className="w-full max-w-md mx-auto p-6 space-y-6 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Linear Progress Bars</h3>
        <p className="text-xs text-neutral-500">Accessible with animated fill, status icons & indeterminate shimmer</p>
      </div>

      {/* Determinate with Shimmer */}
      <ProgressBar
        value={progress}
        label="Assignment Upload Progress"
        showValue
        variant="primary"
        shimmer
      />

      {/* Complete State */}
      <ProgressBar
        value={100}
        label="Plagiarism & AI Integrity Verification"
        showValue
        variant="success"
        status="complete"
      />

      {/* Indeterminate State */}
      <ProgressBar
        indeterminate
        label="Generating Digital Turnitin Receipt..."
        variant="gradient"
      />

      {/* Interactive Slider to test */}
      <div className="pt-2 flex items-center gap-3">
        <span className="text-xs text-neutral-500">Adjust:</span>
        <input
          type="range"
          min="0"
          max="100"
          value={progress}
          onChange={(e) => setProgress(Number(e.target.value))}
          className="w-full accent-blue-600"
        />
        <span className="text-xs font-mono font-bold w-10 text-right">{progress}%</span>
      </div>
    </div>
  );
}

export function InteractiveHoverButtonDemo() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      <InteractiveHoverButton text="Get Started" />
      <InteractiveHoverButton>Explore Portal</InteractiveHoverButton>
    </div>
  );
}

export function TextBlockAnimationDemo() {
  const [replayKey, setReplayKey] = useState(0);

  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-6">
      <div key={replayKey} className="text-center">
        <TextBlockAnimation
          text={[
            "Next-Gen Academic Submission",
            "Block Wipe Reveal Animation",
            "Powered by GSAP & React"
          ]}
          blockColor="#2563eb"
          textClassName="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white"
          className="items-center"
        />
      </div>
      <button
        onClick={() => setReplayKey((k) => k + 1)}
        className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 cursor-pointer"
      >
        Replay Animation
      </button>
    </div>
  );
}

export function PasswordStrengthDemo() {
  const id = useId();
  const [value, setValue] = useState("");

  return (
    <div className="mx-auto w-full max-w-[320px]">
      <label
        htmlFor={id}
        className="block text-[13px] font-medium text-stone-700 dark:text-stone-200"
      >
        New password
      </label>

      <input
        id={id}
        type="password"
        value={value}
        autoComplete="new-password"
        spellCheck={false}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Type a password"
        className="mt-1.5 h-10 w-full rounded-[10px] border-2 border-stone-200 bg-stone-100/70 px-3 text-[13px] text-stone-700 shadow-[inset_0_1px_2px_rgba(28,25,23,0.07)] outline-none transition-[background-color,border-color,box-shadow] duration-150 placeholder:text-stone-400 focus:border-[#4568FF] focus:bg-white focus:shadow-none focus-visible:outline-none dark:border-white/[0.08] dark:bg-[#1D1D1A] dark:text-stone-200 dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.45)] dark:placeholder:text-stone-500 dark:focus:border-[#93B0FF] dark:focus:bg-[#252522]"
      />

      <PasswordStrength value={value} className="mt-3" />
    </div>
  );
}

export function InputModalDemo() {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-neutral-100 dark:bg-neutral-900 rounded-3xl gap-4">
      <Button onClick={() => setOpen(true)} className="rounded-2xl">
        Open Audio Show Creator
      </Button>
      {open && <InputModal isOpen={open} onClose={() => setOpen(false)} />}
    </div>
  );
}

export default PasswordStrengthDemo;
