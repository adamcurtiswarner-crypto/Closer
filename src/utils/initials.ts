// Avatar initial helpers shared by ProfileCard and the Us view.

// Array.from splits on code points, so names starting with an accented or
// non-BMP character still yield one whole glyph rather than half a surrogate.
export function firstGrapheme(name: string): string {
  const first = Array.from(name.trim())[0];
  return first ? first.toUpperCase() : '?';
}

export function getInitials(name: string | null): string {
  if (!name) return '?';
  return firstGrapheme(name);
}
