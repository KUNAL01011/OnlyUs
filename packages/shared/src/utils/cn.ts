export type ClassValue =
  | string
  | number
  | null
  | false
  | undefined
  | ClassValue[];

/**
 * Tiny, dependency-free className joiner. (The frontend has its own
 * tailwind-merge-aware `cn`; this one is for shared/non-Tailwind contexts.)
 */
export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];
  const walk = (value: ClassValue): void => {
    if (value === null || value === undefined || value === false) return;
    if (Array.isArray(value)) {
      value.forEach(walk);
    } else {
      out.push(String(value));
    }
  };
  inputs.forEach(walk);
  return out.join(" ");
}
