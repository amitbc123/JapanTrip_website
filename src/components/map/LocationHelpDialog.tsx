import { XIcon } from "lucide-react"
import { useEffect } from "react"
import { useLocationHelpStore, type LocationProblem } from "@/stores/location-help-store"

type Platform = "ios-safari" | "ios-chrome" | "ios-app" | "android-chrome" | "android-samsung" | "android-app" | "desktop"

function detectPlatform(): Platform {
  const ua = navigator.userAgent
  const isIos = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
  const isAndroid = /Android/.test(ua)
  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  if (isIos) {
    if (standalone) return "ios-app"
    return /CriOS|FxiOS|EdgiOS/.test(ua) ? "ios-chrome" : "ios-safari"
  }
  if (isAndroid) {
    if (standalone) return "android-app"
    return /SamsungBrowser/.test(ua) ? "android-samsung" : "android-chrome"
  }
  return "desktop"
}

const PLATFORM_NAME: Record<Platform, string> = {
  "ios-safari": "אייפון · Safari",
  "ios-chrome": "אייפון · Chrome",
  "ios-app": "אייפון · האפליקציה במסך הבית",
  "android-chrome": "אנדרואיד · Chrome",
  "android-samsung": "אנדרואיד · דפדפן סמסונג",
  "android-app": "אנדרואיד · האפליקציה במסך הבית",
  desktop: "מחשב",
}

/** Step-by-step instructions to the exact setting, per phone and browser —
 *  a website isn't allowed to open the phone's settings itself. */
const STEPS: Record<Platform, { phone: string[]; site: string[] }> = {
  "ios-safari": {
    phone: [
      "פותחים את אפליקציית ההגדרות (⚙️) ← פרטיות ואבטחה ← שירותי מיקום, ומוודאים שהמתג למעלה דלוק.",
      "באותו מסך גוללים למטה ל-\"אתרי Safari\" ← בוחרים \"בעת השימוש ביישום\", ומדליקים \"מיקום מדויק\".",
    ],
    site: [
      "חוזרים לאתר ב-Safari ולוחצים על סמל ה-aA (או ⚙️) בשורת הכתובת ← \"הגדרות אתר\" ← מיקום ← \"אפשר\".",
      "אם אין שם את האפשרות: הגדרות ← אפליקציות ← Safari ← מיקום (תחת \"הגדרות לאתרים\") ← \"שאל\" או \"אפשר\".",
    ],
  },
  "ios-chrome": {
    phone: [
      "פותחים את אפליקציית ההגדרות (⚙️) ← פרטיות ואבטחה ← שירותי מיקום, ומוודאים שהמתג למעלה דלוק.",
      "באותו מסך גוללים ל-Chrome ← \"בעת השימוש ביישום\", ומדליקים \"מיקום מדויק\".",
    ],
    site: ["חוזרים לאתר ב-Chrome, לוחצים שוב על כפתור המיקום ומאשרים כשנשאלים."],
  },
  "ios-app": {
    phone: [
      "פותחים את אפליקציית ההגדרות (⚙️) ← פרטיות ואבטחה ← שירותי מיקום, ומוודאים שהמתג למעלה דלוק.",
      "באותו מסך גוללים למטה ל-\"אתרי Safari\" ← בוחרים \"בעת השימוש ביישום\", ומדליקים \"מיקום מדויק\" (האפליקציה במסך הבית משתמשת בהרשאה של Safari).",
    ],
    site: [
      "הגדרות ← אפליקציות ← Safari ← מיקום (תחת \"הגדרות לאתרים\") ← \"שאל\" או \"אפשר\".",
      "סוגרים את האפליקציה לגמרי (החלקה למעלה ממסך המשימות) ופותחים שוב.",
    ],
  },
  "android-chrome": {
    phone: ["מחליקים מלמעלה למטה פעמיים ומוודאים ש\"מיקום\" דלוק."],
    site: [
      "באתר ב-Chrome לוחצים על הסמל שמשמאל לכתובת (מנעול / ⚙️) ← הרשאות ← מיקום ← \"אפשר\".",
      "או: ⋮ ← הגדרות ← הגדרות אתר ← מיקום ← מוצאים את האתר ברשימת \"חסומים\" ← \"אפשר\".",
      "אם עדיין חסום: הגדרות הטלפון ← אפליקציות ← Chrome ← הרשאות ← מיקום ← \"אפשר רק בזמן השימוש באפליקציה\".",
    ],
  },
  "android-samsung": {
    phone: ["מחליקים מלמעלה למטה פעמיים ומוודאים ש\"מיקום\" דלוק."],
    site: [
      "בדפדפן: ☰ (תפריט) ← הגדרות ← אתרים והורדות ← הרשאות אתרים ← מיקום ← מאפשרים את האתר.",
      "אם עדיין חסום: הגדרות הטלפון ← אפליקציות ← Samsung Internet ← הרשאות ← מיקום ← \"אפשר רק בזמן השימוש\".",
    ],
  },
  "android-app": {
    phone: ["מחליקים מלמעלה למטה פעמיים ומוודאים ש\"מיקום\" דלוק."],
    site: [
      "לוחצים לחיצה ארוכה על אייקון האפליקציה במסך הבית ← ⓘ (פרטי אפליקציה) ← הרשאות ← מיקום ← \"אפשר רק בזמן השימוש\".",
      "אם אין שם הרשאות: פותחים את האתר ב-Chrome ← ⋮ ← הגדרות ← הגדרות אתר ← מיקום ← מאפשרים את האתר.",
    ],
  },
  desktop: {
    phone: ["מוודאים ששירותי המיקום של המחשב דלוקים (בהגדרות הפרטיות של המערכת)."],
    site: ["לוחצים על הסמל שמשמאל לכתובת האתר (מנעול / ⚙️) ← מיקום ← \"אפשר\", ומרעננים את הדף."],
  },
}

const PROBLEM_TEXT: Record<LocationProblem, { title: string; text: string }> = {
  denied: {
    title: "האתר לא קיבל הרשאה למיקום",
    text: "צריך לאשר לאתר להשתמש במיקום. זה לוקח חצי דקה:",
  },
  unavailable: {
    title: "המיקום לא זמין כרגע",
    text: "כנראה שהמיקום כבוי בטלפון, או שאין קליטת GPS. בודקים קודם את המיקום בטלפון:",
  },
  timeout: {
    title: "לקח יותר מדי זמן למצוא את המיקום",
    text: "נסו שוב, רצוי ליד חלון או בחוץ. אם זה חוזר, בודקים את ההגדרות:",
  },
  unsupported: {
    title: "הדפדפן הזה לא תומך באיתור מיקום",
    text: "נסו לפתוח את האתר ב-Safari (אייפון) או ב-Chrome (אנדרואיד).",
  },
}

/** Sheet explaining exactly where to turn location on, for the phone and
 *  browser it's opened on, with a "try again" button. */
export function LocationHelpDialog() {
  const problem = useLocationHelpStore((s) => s.problem)
  const retry = useLocationHelpStore((s) => s.retry)
  const close = useLocationHelpStore((s) => s.close)

  useEffect(() => {
    if (!problem) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close()
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [problem, close])

  if (!problem) return null
  const platform = detectPlatform()
  const steps = STEPS[platform]
  const info = PROBLEM_TEXT[problem]
  // On iPhone a "denied" usually comes from the phone's own Location
  // Services setting for the browser, so that goes first; elsewhere a denial
  // is the site permission, and "unavailable" means the phone's switch.
  const phoneFirst = problem !== "denied" || platform.startsWith("ios")
  const ordered = phoneFirst ? [...steps.phone, ...steps.site] : [...steps.site, ...steps.phone]

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 sm:items-center" onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={info.title}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85dvh] w-full max-w-md flex-col gap-3 overflow-y-auto rounded-t-2xl bg-card p-4 shadow-xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-bold">📍 {info.title}</h2>
            <p className="text-xs text-muted-foreground">זוהה: {PLATFORM_NAME[platform]}</p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="סגירה"
            className="flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-accent"
          >
            <XIcon className="size-5" aria-hidden />
          </button>
        </div>
        <p className="text-sm">{info.text}</p>
        {problem !== "unsupported" && (
          <ol className="flex list-decimal flex-col gap-2 ps-5 text-sm">
            {ordered.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        )}
        <p className="text-xs text-muted-foreground">
          אתר אינטרנט לא יכול לפתוח בעצמו את ההגדרות של הטלפון, לכן ההוראות כאן מובילות למקום המדויק.
        </p>
        <div className="flex gap-2">
          {retry && problem !== "unsupported" && (
            <button
              type="button"
              onClick={() => {
                const again = retry
                close()
                again()
              }}
              className="h-10 flex-1 rounded-lg bg-primary text-sm font-semibold text-primary-foreground"
            >
              סידרתי, לנסות שוב
            </button>
          )}
          <button type="button" onClick={close} className="h-10 flex-1 rounded-lg border border-border text-sm">
            סגירה
          </button>
        </div>
      </div>
    </div>
  )
}
