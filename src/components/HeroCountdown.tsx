import { useEffect, useState } from "react";
import { EVENT_TARGET_ISO, getCountdownParts, splitDigits } from "@/utils/countdown";

const DIGIT_BOX_CLASS =
  "w-10 h-12 sm:w-11 sm:h-12 md:w-11 md:h-12 flex items-center justify-center rounded-xl " +
  "bg-black/65 border border-gold/40 backdrop-blur-md " +
  "shadow-[0_10px_28px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,220,140,0.22)] " +
  "font-display tabular-nums text-xl sm:text-2xl font-bold text-foreground select-none";

interface CountdownGroupProps {
  value: string;
  label: string;
}

const CountdownGroup = ({ value, label }: CountdownGroupProps) => {
  const digits = splitDigits(value);
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex items-center gap-1 sm:gap-1.5" aria-hidden="true">
        {digits.map((digit, index) => (
          <div key={`${label}-${index}`} className={DIGIT_BOX_CLASS}>
            {digit}
          </div>
        ))}
      </div>
      <span className="text-[10px] sm:text-[11px] font-body uppercase tracking-[0.2em] text-gold-light/85 font-medium">
        {label}
      </span>
    </div>
  );
};

const HeroCountdown = () => {
  const [countdown, setCountdown] = useState(() => getCountdownParts(Date.now(), EVENT_TARGET_ISO));

  useEffect(() => {
    const update = () => {
      setCountdown(getCountdownParts(Date.now(), EVENT_TARGET_ISO));
    };
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, []);

  const accessibleLabel = countdown.isComplete
    ? "Countdown complete: 00 days, 00 hours, 00 minutes"
    : `Countdown to 18 December 2026: ${countdown.days} days, ${countdown.hours} hours, ${countdown.minutes} minutes remaining`;

  return (
    <div
      role="timer"
      aria-label={accessibleLabel}
      data-testid="hero-countdown"
      className="flex items-start justify-center gap-2 sm:gap-3.5 animate-fade-up"
    >
      <CountdownGroup value={countdown.days} label="Days" />
      <span
        aria-hidden="true"
        className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-gold/80 pt-2 sm:pt-2.5 select-none"
      >
        :
      </span>
      <CountdownGroup value={countdown.hours} label="Hours" />
      <span
        aria-hidden="true"
        className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-gold/80 pt-2 sm:pt-2.5 select-none"
      >
        :
      </span>
      <CountdownGroup value={countdown.minutes} label="Minutes" />
    </div>
  );
};

export default HeroCountdown;
