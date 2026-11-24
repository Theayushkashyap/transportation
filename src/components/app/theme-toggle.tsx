"use client"

import { useSyncExternalStore } from "react"
import { Monitor, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"

const OPTS = [["light", Sun, "Light"], ["dark", Moon, "Dark"], ["system", Monitor, "System"]] as const

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false)
  return (
    <div role="radiogroup" aria-label="Theme" className={cn("flex rounded-lg border bg-muted/40 p-0.5", className)}>
      {OPTS.map(([k, Icon, label]) => (
        <button key={k} role="radio" aria-checked={mounted && theme === k} aria-label={label} title={label} onClick={() => setTheme(k)} className={cn("flex flex-1 items-center justify-center rounded-md py-1.5 text-muted-foreground transition-colors hover:text-foreground", mounted && theme === k && "bg-background text-primary shadow-sm")}>
          <Icon className="size-3.5" />
        </button>
      ))}
    </div>
  )
}
