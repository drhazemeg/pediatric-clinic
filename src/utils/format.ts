export function formatLabel(fmt: string) {
  return fmt.replaceAll('_', ' ').replaceAll(/\b\w/gu, (l) => l.toUpperCase());
}

export function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;

  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
