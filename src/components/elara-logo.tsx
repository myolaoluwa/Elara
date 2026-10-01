import type { CSSProperties } from "react";

export function ElaraMark({ className, accentColor = "#79a58e", style }: { className?: string; accentColor?: string; style?: CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 260 240" fill="none" aria-hidden="true">
      <path fill="currentColor" d="M53 91 83 39C99 11 119 8 135 14c22 10 27 41 28 72-33-23-67-18-110 5Z" />
      <path fill={accentColor} d="M144 10c37-1 58 29 66 66 10 42-4 75-31 106l-18-10c14-45 19-108 1-141-5-10-11-16-18-21Z" />
      <path fill={accentColor} d="M153 95c-30-18-58-14-85-3-27 11-56 34-64 59-9 27 2 47 17 57-4-25 20-45 48-66l84-47Z" />
      <path fill="currentColor" d="m70 148 49 35c46 34 79 39 123 27-21 30-54 33-83 27-42-9-76-33-113-66l24-23Z" />
      <path fill="currentColor" d="M219 94c9 21 22 37 31 55 12 24 12 37-4 45-17 9-37 10-60-7 26-28 38-56 33-93Z" />
    </svg>
  );
}

export function ElaraBrand({ className }: { className?: string }) {
  return <span className={className}><span className="brand-symbol"><ElaraMark /></span><span>ELARA</span></span>;
}
