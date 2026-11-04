import { ICONS } from "@/treasure/data"

/** The Treasure Map's own line icons (category and topic glyphs). */
export function Glyph({ name, className = "size-5" }: { name: string; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      dangerouslySetInnerHTML={{ __html: ICONS[name] ?? "" }}
    />
  )
}
