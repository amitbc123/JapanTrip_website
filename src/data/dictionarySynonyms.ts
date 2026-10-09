import { DICTIONARY, type DictPhrase } from "@/data/dictionary"

/** An alternative phrasing that isn't in Omri's original dictionary:
 *  [japanese, romaji, hebrew]. */
type ExtraPhrase = [string, string, string]

/** Groups of phrases that say (roughly) the same thing, swiped through
 *  sideways in the dictionary's large view. A string refers to an existing
 *  dictionary phrase by its Japanese text; a tuple adds a common alternative
 *  phrasing. */
const SYNONYM_GROUPS: (string | ExtraPhrase)[][] = [
  [
    "私は牛乳および乳製品にアレルギーがあります",
    "牛乳にアレルギーがあります",
    "ミルクアレルギーです",
    ["乳製品アレルギーです", "nyūseihin arerugī desu", "יש לי אלרגיה למוצרי חלב"],
  ],
  [
    "これは牛乳が入っていますか",
    "乳製品は入っていますか",
    ["牛乳を使っていますか", "gyūnyū o tsukatte imasu ka", "משתמשים בזה בחלב?"],
  ],
  [
    "乳製品なしでお願いします",
    "乳製品なしのお薦めは何ですか",
    ["牛乳抜きでお願いします", "gyūnyū nuki de onegaishimasu", "בלי חלב בבקשה"],
  ],
  [
    "とても美味しいです",
    ["美味しい！", "oishii!", "טעים!"],
    ["うまい！", "umai!", "טעים! (סלנג)"],
  ],
  [
    "お会計お願いします",
    ["お勘定お願いします", "okanjō onegaishimasu", "חשבון בבקשה (ניסוח אחר)"],
    ["チェックお願いします", "chekku onegaishimasu", "צ'ק בבקשה"],
  ],
  ["これは何ですか", "中身は何ですか"],
  [
    "ありがとうございます",
    ["どうもありがとうございます", "dōmo arigatō gozaimasu", "תודה רבה מאוד"],
    ["ありがとう", "arigatō", "תודה (לחברים)"],
    ["どうも", "dōmo", "תודה (קצר וקליל)"],
  ],
  [
    "すみません",
    "申し訳ございません",
    ["ごめんなさい", "gomen nasai", "סליחה / מצטער"],
    ["ごめん", "gomen", "סורי (לחברים)"],
  ],
  ["おはようございます", ["おはよう", "ohayō", "בוקר טוב (לחברים)"]],
  ["おやすみなさい", ["おやすみ", "oyasumi", "לילה טוב (לחברים)"]],
  ["はい", ["ええ", "ē", "כן (רך יותר)"], ["そうです", "sō desu", "נכון, כן"]],
  ["いいえ", ["いいえ、結構です", "iie, kekkō desu", "לא, תודה"]],
  ["わかりません", "全然わからなかった", ["よくわかりません", "yoku wakarimasen", "לא ממש הבנתי"]],
  ["もっとゆっくり話してください", ["もう一度お願いします", "mō ichido onegaishimasu", "שוב פעם בבקשה"]],
  [
    "英語が話せる人はいますか",
    "日本語が話せません",
    ["英語は話せますか", "eigo wa hanasemasu ka", "אתה מדבר אנגלית?"],
  ],
  ["いくらですか", "料金はいくらですか", ["おいくらですか", "o-ikura desu ka", "כמה זה עולה? (מנומס יותר)"]],
  ["高いです", ["高すぎます", "takasugimasu", "יקר מדי (בהדגשה)"]],
  ["大丈夫です", "いいですよ", "問題ありません"],
  ["だめです", ["できません", "dekimasen", "אי אפשר / לא יכול"]],
  [
    "これが欲しいです",
    "これを買いたいです",
    ["これをください", "kore o kudasai", "את זה בבקשה"],
  ],
  ["一緒に写真を撮っていいですか", ["写真を撮ってもいいですか", "shashin o totte mo ii desu ka", "מותר לצלם?"]],
  ["トイレはどこですか", ["お手洗いはどこですか", "otearai wa doko desu ka", "איפה השירותים? (מנומס)"]],
  ["駅はどこですか", ["一番近い駅はどこですか", "ichiban chikai eki wa doko desu ka", "איפה התחנה הכי קרובה?"]],
  ["道に迷いました", ["ここはどこですか", "koko wa doko desu ka", "איפה אני?"]],
  ["助けてください", "助けて"],
  ["警察を呼んでください", ["110番してください", "hyakutō-ban shite kudasai", "תתקשרו ל-110 (משטרה)"]],
  ["救急車を呼んでください", ["119番してください", "hyakujūkyū-ban shite kudasai", "תתקשרו ל-119 (אמבולנס)"]],
  [
    "医者が必要です",
    "病院 / クリニック",
    ["病院に連れて行ってください", "byōin ni tsurete itte kudasai", "קחו אותי לבית חולים בבקשה"],
  ],
  ["気分がよくないです", ["具合が悪いです", "guai ga warui desu", "אני מרגיש לא טוב"]],
  ["はじめまして", ["よろしくお願いします", "yoroshiku onegaishimasu", "נעים להכיר"]],
  ["すごいです", "素晴らしい", "素敵ですね", ["やばい！", "yabai!", "מטורף! (סלנג)"]],
  ["かっこいいです", ["かっこいい！", "kakkoii!", "מגניב! (לחברים)"]],
  ["可愛いです", ["可愛い！", "kawaii!", "חמוד! (לחברים)"]],
  [
    "またね",
    ["じゃあね", "jā ne", "ביי (לחברים)"],
    ["さようなら", "sayōnara", "להתראות (לפרידה ארוכה)"],
  ],
  ["何が起こってるの？", "何が起きていますか"],
  ["疲れました", ["疲れた", "tsukareta", "עייף (לחברים)"]],
  ["もうどうでもいい", ["しょうがない", "shōganai", "אין מה לעשות"]],
  ["行きましょう", ["行こう！", "ikō!", "בואו נלך! (לחברים)"]],
  ["駐車禁止"],
  ["駐車場"],
]

export const SYNONYM_NOTE = "ניסוח נרדף - לא מהמילון המקורי"

function dedupeKey(p: DictPhrase): string {
  return `${p.ja}|${p.he}|${p.image ?? ""}`
}

const phrasesByJa = new Map<string, DictPhrase[]>()
for (const chapter of DICTIONARY) {
  for (const section of chapter.sections) {
    for (const phrase of section.phrases) {
      const list = phrasesByJa.get(phrase.ja) ?? []
      list.push(phrase)
      phrasesByJa.set(phrase.ja, list)
    }
  }
}

/** Every group resolved to phrase objects, de-duplicated (the same phrase
 *  can appear in two chapters). */
const resolvedGroups: DictPhrase[][] = SYNONYM_GROUPS.map((group, gi) => {
  const seen = new Set<string>()
  const out: DictPhrase[] = []
  group.forEach((entry, ei) => {
    const candidates: DictPhrase[] =
      typeof entry === "string"
        ? (phrasesByJa.get(entry) ?? [])
        : [{ id: `syn-${gi}-${ei}`, ja: entry[0], romaji: entry[1], he: entry[2], note: SYNONYM_NOTE }]
    for (const phrase of candidates) {
      const key = dedupeKey(phrase)
      if (seen.has(key)) continue
      seen.add(key)
      out.push(phrase)
    }
  })
  return out
})

const groupByPhraseId = new Map<string, DictPhrase[]>()
for (const group of resolvedGroups) {
  for (const phrase of group) {
    // Map the phrase's same-text twins in other chapters to the group too.
    for (const twin of phrasesByJa.get(phrase.ja) ?? [phrase]) {
      if (dedupeKey(twin) === dedupeKey(phrase)) groupByPhraseId.set(twin.id, group)
    }
    groupByPhraseId.set(phrase.id, group)
  }
}

/** The phrase itself first, then its synonyms; just [phrase] when it has
 *  none. */
export function synonymsFor(phrase: DictPhrase): DictPhrase[] {
  const group = groupByPhraseId.get(phrase.id)
  if (!group) return [phrase]
  const key = dedupeKey(phrase)
  return [phrase, ...group.filter((p) => dedupeKey(p) !== key)]
}
