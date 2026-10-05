/** Omri's pocket Japanese dictionary ("מילון יפנית: מסע אחרי התואר"),
 *  transcribed from his PDF. Public content, so it ships with the site and
 *  needs nothing from the private trip file. */

/** [japanese, romaji, hebrew, note?] */
type PhraseTuple = [string, string, string, string?]

export interface DictPhrase {
  id: string
  ja: string
  romaji: string
  he: string
  note?: string
  /** Sign picture under public/dictionary-signs/. */
  image?: string
  /** "avoid" = a word/topic not to bring up; "ok" = a safe alternative. */
  tone?: "avoid" | "ok"
}

export interface DictRule {
  icon: string
  title: string
  detail: string
}

export interface DictSection {
  title: string
  important?: boolean
  intro?: string[]
  phrases: DictPhrase[]
  rules: DictRule[]
}

export interface DictChapter {
  id: string
  number: number
  title: string
  emoji: string
  sections: DictSection[]
}

interface SectionInput {
  title: string
  important?: boolean
  intro?: string[]
  phrases?: PhraseTuple[]
  signs?: [string, string, string, string, string?][]
  tone?: "avoid" | "ok"
  rules?: [string, string, string][]
}

function chapter(id: string, number: number, title: string, emoji: string, sections: SectionInput[]): DictChapter {
  return {
    id,
    number,
    title,
    emoji,
    sections: sections.map((s, si) => ({
      title: s.title,
      important: s.important,
      intro: s.intro,
      phrases: [
        ...(s.phrases ?? []).map(([ja, romaji, he, note], pi) => ({
          id: `${id}-${si}-${pi}`,
          ja,
          romaji,
          he,
          note,
          tone: s.tone,
        })),
        ...(s.signs ?? []).map(([image, ja, romaji, he, note], pi) => ({
          id: `${id}-${si}-s${pi}`,
          ja,
          romaji,
          he,
          note,
          image: `dictionary-signs/${image}.png`,
        })),
      ],
      rules: (s.rules ?? []).map(([icon, title, detail]) => ({ icon, title, detail })),
    })),
  }
}

export const DICTIONARY: DictChapter[] = [
  chapter("food", 1, "אוכל ואלרגיות", "🍜", [
    {
      title: "אלרגיה לחלב - חשוב מאוד!",
      important: true,
      phrases: [
        ["私は牛乳および乳製品にアレルギーがあります", "watashi wa gyūnyū oyobi nyūseihin ni arerugī ga arimasu", "אני אלרגי לחלב ולמוצריו"],
        ["牛乳にアレルギーがあります", "gyūnyū ni arerugī ga arimasu", "יש לי אלרגיה לחלב"],
        ["乳糖不耐症です", "nyūtō futaishō desu", "יש לי רגישות ללקטוז"],
        ["これは牛乳が入っていますか", "kore wa gyūnyū ga haitte imasu ka", "יש בזה חלב?"],
        ["乳製品は入っていますか", "nyūseihin wa haitte imasu ka", "יש בזה מוצרי חלב?"],
        ["バターが入っていますか", "batā ga haitte imasu ka", "יש בזה חמאה?"],
        ["クリームが入っていますか", "kurīmu ga haitte imasu ka", "יש בזה שמנת?"],
        ["チーズが入っていますか", "chīzu ga haitte imasu ka", "יש בזה גבינה?"],
        ["乳製品なしでお願いします", "nyūseihin nashi de onegaishimasu", "ללא חלב בבקשה"],
      ],
    },
    {
      title: "דגים - שמות וסוגים (לאלרגיה ולהזמנה)",
      phrases: [
        ["まぐろ", "maguro", "טונה (מגורו)"],
        ["サーモン", "sāmon", "סלמון (סאמון)"],
        ["さば", "saba", "מקרל (סאבה)"],
        ["たい", "tai", "דג ים (טאי)"],
        ["うなぎ", "unagi", "צלופח (אונאגי)"],
        ["いくら", "ikura", "ביצי סלמון (איקורה)"],
        ["いか", "ika", "דיונון (איקה)"],
        ["えび", "ebi", "שרימפס (אבי)"],
        ["ロブスター", "robusutā", "לובסטר (רובוסוטא)"],
        ["魚が入っていますか", "sakana ga haitte imasu ka", "יש בזה דגים?"],
        ["のりが入っていますか", "nori ga haitte imasu ka", "יש בזה אצות?"],
      ],
    },
    {
      title: "שאלות על אוכל - בטיחות ובקשות",
      phrases: [
        ["とても美味しいです", "totemo oishii desu", "זה טעים מאוד"],
        ["辛いですか", "karai desu ka", "האם זה חריף?"],
        ["中身は何ですか", "nakami wa nan desu ka", "מה זה מכיל?"],
        ["揚げていますか", "agete imasu ka", "זה מטוגן?"],
        ["食べても大丈夫ですか", "tabete mo daijōbu desu ka", "זה בטוח בשבילי?"],
        ["乳製品なしのお薦めは何ですか", "nyūseihin nashi no osusume wa nan desu ka", "מה ממליצים בלי חלב?"],
        ["グルテンなし", "guruten nashi", "ללא גלוטן"],
        ["私はベジタリアンです", "watashi wa bejitarian desu", "אני צמחוני"],
        ["私はヴィーガンです", "watashi wa vīgan desu", "אני טבעוני"],
        ["これは何ですか", "kore wa nan desu ka", "מה זה?"],
        ["豚肉は食べません", "butaniku wa tabemasen", "אני לא אוכל בשר חזיר"],
        ["卵が入っていますか", "tamago ga haitte imasu ka", "יש בזה ביצים?"],
      ],
    },
    {
      title: "אוכל יפני - מה לאכול",
      phrases: [
        ["ラーメン", "rāmen", "ראמן"],
        ["寿司", "sushi", "סושי"],
        ["天ぷら", "tempura", "טמפורה"],
        ["温泉卵", "onsen tamago", "אונסן טמגו (ביצה מהאונסן)"],
        ["カツカレー", "katsu karē", "קטסו קארי (קציצה עם קארי)"],
        ["たこ焼き", "takoyaki", "טקויאקי (כדורי תמנון)"],
        ["そば", "soba", "סובה (אטריות כוסמת)"],
        ["うどん", "udon", "אודון"],
        ["焼きそば", "yakisoba", "יאקיסובה (אטריות מטוגנות)"],
        ["おにぎり", "onigiri", "אוניגירי (כדורי אורז)"],
        ["味噌汁", "miso shiru", "מרק מיסו"],
        ["餃子", "gyōza", "גיוזה (כיסונים)"],
        ["枝豆", "edamame", "אדממה"],
        ["餅", "mochi", "מוצ'י (עוגת אורז)"],
        ["抹茶", "matcha", "מאצ'ה (תה ירוק)"],
        ["お会計お願いします", "okaikei onegaishimasu", "חשבון בבקשה / לשלם"],
        ["領収書をください", "ryōshūsho o kudasai", "קבלה בבקשה"],
      ],
    },
  ]),

  chapter("daily", 2, "יום-יום", "💬", [
    {
      title: "בסיס - שימוש יומי",
      phrases: [
        ["こんにちは", "konnichiwa", "שלום / היי"],
        ["おはようございます", "ohayō gozaimasu", "בוקר טוב"],
        ["おやすみなさい", "oyasumi nasai", "לילה טוב"],
        ["ありがとうございます", "arigatō gozaimasu", "תודה רבה"],
        ["すみません", "sumimasen", "סליחה (גם כדי לפנות למישהו)"],
        ["申し訳ございません", "mōshiwake gozaimasen", "אני מצטער"],
        ["はい", "hai", "כן"],
        ["いいえ", "iie", "לא"],
        ["たぶん", "tabun", "אולי"],
        ["わかりません", "wakarimasen", "לא מבין"],
        ["日本語が話せません", "nihongo ga hanasemasen", "לא מדבר יפנית"],
        ["英語が話せる人はいますか", "eigo ga hanaseru hito wa imasu ka", "יש פה מישהו שמדבר אנגלית?"],
        ["もっとゆっくり話してください", "motto yukkuri hanashite kudasai", "קצת יותר לאט בבקשה"],
        ["書いてもらえますか", "kaite moraemasu ka", "אפשר לכתוב את זה?"],
        ["いくらですか", "ikura desu ka", "כמה זה עולה?"],
      ],
    },
    {
      title: "ניווט ועזרה",
      phrases: [
        ["高いです", "takai desu", "יקר מדי"],
        ["大丈夫です", "daijōbu desu", "זה בסדר"],
        ["ちょっと...", "chotto...", "זה קצת... (דרך מנומסת לסרב)"],
        ["お願いします", "onegaishimasu", "בבקשה"],
        ["いいですよ", "ii desu yo", "אפשר"],
        ["だめです", "dame desu", "אי אפשר"],
        ["これが欲しいです", "kore ga hoshii desu", "אני רוצה את זה"],
        ["トイレはどこですか", "toire wa doko desu ka", "איפה השירותים?"],
        ["一緒に写真を撮っていいですか", "issho ni shashin o totte ii desu ka", "אפשר תמונה ביחד?"],
        ["今何時ですか", "ima nanji desu ka", "מה השעה עכשיו?"],
        ["駅はどこですか", "eki wa doko desu ka", "איפה תחנת הרכבת?"],
        ["空港はどこですか", "kūkō wa doko desu ka", "איפה שדה התעופה?"],
        ["道に迷いました", "michi ni mayoimashita", "הלכתי לאיבוד"],
        ["助けてください", "tasukete kudasai", "עזרו לי בבקשה"],
      ],
    },
    {
      title: "מספרים - שימוש יומי",
      phrases: [
        ["一", "ichi", "1"],
        ["二", "ni", "2"],
        ["三", "san", "3"],
        ["四", "shi / yon", "4"],
        ["五", "go", "5"],
        ["六", "roku", "6"],
        ["七", "shichi / nana", "7"],
        ["八", "hachi", "8"],
        ["九", "kyū / ku", "9"],
        ["十", "jū", "10"],
        ["百", "hyaku", "100"],
        ["千", "sen", "1,000"],
        ["一万", "ichi man", "10,000 (יחידת בסיס ביפנית)"],
        ["十万", "jū man", "100,000"],
        ["百万", "hyaku man", "1,000,000"],
        ["いくつ / 何", "ikutsu / nan", "כמה? (מספר)"],
        ["何階ですか", "nan kai desu ka", "באיזו קומה?"],
        ["何人ですか", "nan nin desu ka", "כמה אנשים?"],
      ],
    },
  ]),

  chapter("social", 3, "חברתי ואנימה", "🤝", [
    {
      title: "היכרות, LINE ושיחה",
      phrases: [
        ["お名前は何ですか", "onamae wa nan desu ka", "מה שמך?"],
        ["私の名前は...です", "watashi no namae wa ... desu", "שמי..."],
        ["私はイスラエルから来ました", "watashi wa isuraeru kara kimashita", "אני מישראל"],
        ["はじめまして", "hajimemashite", "נעים מאוד"],
        ["私たちは友達です", "watashitachi wa tomodachi desu", "אנחנו חברים"],
        ["お歳はいくつですか", "otoshi wa ikutsu desu ka", "בן כמה אתה?"],
        ["私は二十歳です", "watashi wa hatachi desu", "אני בן 20", "להחליף את המספר"],
        ["お仕事は何ですか", "oshigoto wa nan desu ka", "מה אתה עושה?"],
        ["学生です", "gakusei desu", "אני סטודנט"],
        ["アニメが大好きです", "anime ga daisuki desu", "אני אוהב אנימה"],
        ["好きなアニメは何ですか", "sukina anime wa nan desu ka", "מה האנימה האהובה עליך?"],
        ["漫画", "manga", "מנגה"],
        ["電話番号を教えてもらえますか", "denwa bangō o oshiete moraemasu ka", "מה המספר שלך?"],
        ["LINEで友達になってもいいですか", "LINE de tomodachi ni natte mo ii desu ka", "אפשר להוסיף אותך ב-LINE?"],
        ["LINEのIDを教えてください", "LINE no ID o oshiete kudasai", "שלח לי את ה-LINE שלך"],
        ["LINEを使っていますか", "LINE o tsukatte imasu ka", "יש לך LINE?"],
        ["コーヒーでも行きませんか", "kōhī demo ikimasen ka", "בא לך קפה?"],
        ["乾杯", "kanpai", "לחיים!"],
        ["どうぞ", "dōzo", "בבקשה / בשבילך"],
        ["問題ありません", "mondai arimasen", "אין בעיה"],
        ["面白いですね", "omoshiroi desu ne", "מעניין!"],
        ["かっこいいです", "kakkoii desu", "זה מגניב"],
        ["可愛いです", "kawaii desu", "זה חמוד"],
        ["すごいです", "sugoi desu", "מדהים!"],
        ["またね", "mata ne", "ביי / להתראות"],
        ["気をつけて", "ki o tsukete", "שמור על עצמך / דרך צלחה"],
        ["また会う日を楽しみにしています", "mata au hi o tanoshimi ni shite imasu", "מחכה שניפגש שוב"],
        ["楽しかったですね", "tanoshikatta desu ne", "היה כיף!"],
      ],
    },
  ]),

  chapter("hotel", 4, "לינה ומלונות", "🏨", [
    {
      title: "צ'ק-אין, שאלות, בעיות",
      phrases: [
        ["予約しました", "yoyaku shimashita", "הזמנתי חדר"],
        ["予約番号は...です", "yoyaku bangō wa ... desu", "מספר ההזמנה שלי..."],
        ["チェックインをお願いします", "chekku-in o onegaishimasu", "צ'ק-אין בבקשה"],
        ["チェックアウトは何時ですか", "chekku-auto wa nanji desu ka", "מתי הצ'ק-אאוט?"],
        ["三人部屋をお願いします", "sannin-beya o onegaishimasu", "חדר ל-3 אנשים בבקשה"],
        ["WiFiのパスワードは何ですか", "WiFi no pasuwādo wa nan desu ka", "מה הסיסמה של ה-WiFi?"],
        ["お湯が出ません", "oyu ga demasen", "אין מים חמים"],
        ["エアコンが壊れています", "eakon ga kowarete imasu", "המזגן לא עובד"],
        ["タオルをもっともらえますか", "taoru o motto moraemasu ka", "אפשר עוד מגבות?"],
        ["温泉", "onsen", "אונסן (אמבט יפני)"],
        ["温泉は何時から何時までですか", "onsen wa nanji kara nanji made desu ka", "מה שעות האונסן?"],
        ["朝食は付いていますか", "chōshoku wa tsuite imasu ka", "ארוחת בוקר כלולה?"],
        ["金庫はありますか", "kinko wa arimasu ka", "יש כספת?"],
        ["鍵を忘れました", "kagi o wasuremashita", "שכחתי את המפתח"],
        ["近くの地図をもらえますか", "chikaku no chizu o moraemasu ka", "אפשר מפה של האזור?"],
      ],
    },
  ]),

  chapter("transport", 5, "תחבורה ציבורית", "🚆", [
    {
      title: "רכבת, אוטובוס, מונית",
      phrases: [
        ["何線ですか", "nan sen desu ka", "איזה קו?"],
        ["この電車はどこへ行きますか", "kono densha wa doko e ikimasu ka", "לאן הרכבת הזו נוסעת?"],
        ["...まで行ってください", "... made itte kudasai", "עד [X] בבקשה"],
        ["駅はいくつですか", "eki wa ikutsu desu ka", "כמה תחנות?"],
        ["Suicaカード", "Suica kādo", "כרטיס סוויקה (Suica)"],
        ["このバスはどこへ行きますか", "kono basu wa doko e ikimasu ka", "לאן האוטובוס הזה נוסע?"],
        ["次のバスは何時ですか", "tsugi no basu wa nanji desu ka", "מתי האוטובוס הבא?"],
        ["時刻表", "jikokuhyō", "לוח זמנים"],
        ["新幹線", "shinkansen", "שינקנסן (רכבת מהירה)"],
        ["特急", "tokkyū", "אקספרס / מהיר"],
        ["各駅停車", "kakueki teisha", "רגיל / עוצר בכל תחנה"],
        ["...番線", "... bansen", "רציף מספר..."],
        ["...までお願いします", "... made onegaishimasu", "(במונית) עד [X] בבקשה"],
        ["料金はいくらですか", "ryōkin wa ikura desu ka", "כמה עולה הנסיעה?"],
        ["ここで切符を買えますか", "koko de kippu o kaemasu ka", "אפשר לקנות כאן כרטיסים?"],
        ["荷物を忘れました", "nimotsu o wasuremashita", "שכחתי תיק / חפץ"],
        ["忘れ物センター", "wasuremono sentā", "מחלקת אבדות ומציאות"],
      ],
    },
  ]),

  chapter("driving", 6, "נהיגה - מילים חיוניות", "🚗", [
    {
      title: "רשיון, דלק, ניווט, תקלות",
      phrases: [
        ["国際運転免許", "kokusai unten menkyo", "רשיון נהיגה בינלאומי"],
        ["自動車保険", "jidōsha hoken", "ביטוח רכב"],
        ["レンタカー", "rentakā", "השכרת רכב"],
        ["ガソリンスタンドはどこですか", "gasorin sutando wa doko desu ka", "איפה יש תחנת דלק?"],
        ["レギュラー", "regyurā", "בנזין רגיל"],
        ["ハイオク", "haioku", "בנזין פרימיום"],
        ["ディーゼル", "dīzeru", "דיזל"],
        ["GPS / ナビ", "GPS / nabi", "GPS / ניווט"],
        ["右へ曲がってください", "migi e magatte kudasai", "פנה ימינה"],
        ["左へ曲がってください", "hidari e magatte kudasai", "פנה שמאלה"],
        ["まっすぐ", "massugu", "ישר"],
        ["ここで止めてください", "koko de tomete kudasai", "עצור כאן"],
        ["Uターンしてください", "yūtān shite kudasai", "סיבוב פרסה / חזרה"],
        ["トンネル", "tonneru", "מנהרה"],
        ["駐車場", "chūshajō", "חניון"],
        ["駐車禁止", "chūsha kinshi", "חניה אסורה"],
        ["事故がありました", "jiko ga arimashita", "הייתה תאונה"],
        ["警察を呼んでください", "keisatsu o yonde kudasai", "תתקשרו למשטרה"],
        ["車が壊れました", "kuruma ga kowaremashita", "הרכב התקלקל"],
        ["パンクしました", "panku shimashita", "תקר בצמיג"],
        ["バッテリーが上がっていました", "batterī ga agatte imashita", "המצבר התרוקן"],
        ["事故証明書", "jiko shōmeisho", "אישור תאונה (דו\"ח משטרה)"],
      ],
    },
  ]),

  chapter("medical", 7, "רפואי וחירום", "🏥", [
    {
      title: "מצבי חירום + בריאות",
      important: true,
      phrases: [
        ["医者が必要です", "isha ga hitsuyō desu", "אני צריך רופא"],
        ["気分がよくないです", "kibun ga yokunai desu", "אני לא מרגיש טוב"],
        ["お腹が痛いです", "onaka ga itai desu", "כואבת לי הבטן"],
        ["頭が痛いです", "atama ga itai desu", "כואב לי הראש"],
        ["閉所恐怖症があります", "heisho kyōfushō ga arimasu", "אני קלסטרופובי"],
        ["大腸炎があります", "daichōen ga arimasu", "יש לי קוליטיס"],
        ["薬を飲んでいます", "kusuri o nonde imasu", "אני לוקח תרופות קבועות"],
        ["牛乳にアレルギーがあります", "gyūnyū ni arerugī ga arimasu", "אני אלרגי לחלב"],
        ["病院 / クリニック", "byōin / kurinikku", "בית חולים / מרפאה"],
        ["危険です", "kiken desu", "זה מסוכן"],
        ["助けて", "tasukete", "הצילו! / עזרה!"],
        ["救急車を呼んでください", "kyūkyūsha o yonde kudasai", "תתקשרו לאמבולנס"],
        ["警察を呼んでください", "keisatsu o yonde kudasai", "תתקשרו למשטרה"],
        ["パスポートをなくしました", "pasupōto o nakushimashita", "איבדתי את הדרכון"],
        ["イスラエル大使館", "isuraeru taishikan", "שגרירות ישראל", "ביפן יש שגרירות בטוקיו, לא קונסוליה"],
        ["旅行保険", "ryokō hoken", "ביטוח נסיעות"],
      ],
    },
  ]),

  chapter("anime", 8, "אנימה, מנגה וגיימינג", "🎮", [
    {
      title: "מושגים, קניות, ביטויים",
      phrases: [
        ["アニメ", "anime", "אנימה"],
        ["漫画", "manga", "מנגה"],
        ["コスプレ", "kosupure", "קוספליי"],
        ["フィギュア", "figyua", "פיגורה / פסלון"],
        ["オタク", "otaku", "אוטאקו (חובב מושבע)"],
        ["ワイフ", "waifu", "וייפו (דמות אהובה)"],
        ["少年", "shōnen", "שונן (אנימה לנערים)"],
        ["少女", "shōjo", "שוג'ו (אנימה לנערות)"],
        ["異世界", "isekai", "איסקאי (גיבור שעובר לעולם אחר)"],
        ["限定 / コレクター", "gentei / korekutā", "מוצר מוגבל / לאספנים"],
        ["...のグッズはありますか", "... no guzzu wa arimasu ka", "יש מוצרים של [שם]?"],
        ["限定版はありますか", "genteiban wa arimasu ka", "יש מהדורה מוגבלת?"],
        ["秋葉原", "Akihabara", "אקיהבארה"],
        ["中野ブロードウェイ", "Nakano Burōdowei", "נקאנו ברודוויי"],
        ["スタジオジブリ", "Sutajio Jiburi", "סטודיו ג'יבלי"],
        ["任天堂ミュージアム", "Nintendō Myūjiamu", "מוזיאון נינטנדו (אוג'י)"],
        ["裏切り", "uragiri", "בגידה (בחבר)"],
        ["なんだ？", "nanda?", "נאנדה? (מה?!)"],
        ["なんだって？", "nandatte?", "נאנדאטה? (מה?! בהגזמה)"],
        ["やめて", "yamete", "יאמטה (תפסיק!)"],
        ["注意して", "chūi shite", "צ'ואי שיטה (שים לב)"],
      ],
    },
  ]),

  chapter("jokes", 9, "דאחקות - ביטויים לחברים", "😂", [
    {
      title: "ביטויי מצב - כשדברים לא הולכים לפי התכנון",
      phrases: [
        ["彼は今日ちょっとヘンです", "kare wa kyō chotto hen desu", "הוא לא בסדר היום"],
        ["私たちは問題があります", "watashitachi wa mondai ga arimasu", "אנחנו בבעיה"],
        ["計画通りじゃないです", "keikaku dōri ja nai desu", "זה לא לפי התכנון"],
        ["全然わからなかった", "zenzen wakaranakatta", "פשוט לא הבנתי כלום"],
        ["疲れました", "tsukaremashita", "אני גמור / עייפתי"],
        ["でも、それはおかしいですよ", "demo, sore wa okashii desu yo", "אבל זה לא הגיוני"],
        ["いいえ、私じゃないですよ", "iie, watashi ja nai desu yo", "לא, זה לא אני"],
        ["何が起こってるの？", "nani ga okotteru no?", "מה קורה פה?!"],
        ["ちょっと考えて", "chotto kangaete", "רגע, תחשוב"],
        ["わかった、いいです、諦めた", "wakatta, ii desu, akirameta", "אוקיי, בסדר, מוותר"],
        ["もう一度やり直せますか", "mō ichido yarinaosemasu ka", "אפשר לנסות מחדש?"],
        ["なんで俺たちだけに？", "nande ore-tachi dake ni?", "למה זה קורה רק לנו?"],
        ["全然違う", "zenzen chigau", "זה לגמרי לא מה שחשבתי"],
        ["食べ物があるからいい", "tabemono ga aru kara ii", "לפחות יש אוכל"],
        ["変な人ですね", "hen na hito desu ne", "הוא/היא מוזר/ה"],
        ["笑ったわ", "waratta wa", "זה הצחיק אותי"],
        ["日本語が消えた", "nihongo ga kieta", "כל היפנית נמחקה לי מהראש"],
        ["何を言いたかったか忘れちゃった", "nani o iitakatta ka wasurechatta", "שכחתי מה רציתי להגיד"],
        ["もうどうでもいい", "mō dō demo ii", "כבר לא אכפת לי"],
      ],
    },
  ]),

  chapter("tech", 10, "השכלה ועולם ההיי-טק", "🎓", [
    {
      title: "מילים - אקדמיה, היי-טק, מחשוב",
      phrases: [
        ["大学", "daigaku", "אוניברסיטה"],
        ["学生", "gakusei", "סטודנט"],
        ["学士", "gakushi", "תואר ראשון (בוגר)"],
        ["修士", "shūshi", "תואר שני (מוסמך)"],
        ["博士", "hakase", "דוקטורט"],
        ["研究", "kenkyū", "מחקר"],
        ["教授", "kyōju", "פרופסור"],
        ["キャンパス", "kyanpasu", "קמפוס"],
        ["IT会社 / テク会社", "IT kaisha / teku kaisha", "חברת היי-טק"],
        ["プログラマー", "puroguramā", "מתכנת"],
        ["エンジニア", "enjinia", "מהנדס"],
        ["人工知能 / AI", "jinkō chinō / AI", "בינה מלאכותית"],
        ["コンピューター", "konpyūtā", "מחשב"],
        ["スマホ", "sumaho", "טלפון חכם"],
        ["アプリ", "apuri", "אפליקציה"],
        ["ソフトウェア", "sofutowea", "תוכנה"],
        ["ハードウェア", "hādowea", "חומרה"],
        ["サイバー", "saibā", "סייבר"],
        ["開発", "kaihatsu", "פיתוח"],
        ["製品 / プロダクト", "seihin / purodakuto", "מוצר"],
        ["スタートアップ", "sutātoappu", "סטארטאפ"],
        ["日本で仕事を探していますか", "nihon de shigoto o sagashite imasu ka", "אתם מחפשים עובדים ביפן?"],
        ["IT業界で働いています", "IT gyōkai de hataraite imasu", "אני עובד בהיי-טק"],
        ["会議 / カンファレンス", "kaigi / konfarensu", "פגישה / כנס"],
        ["チームミーティング", "chīmu mītingu", "ישיבת צוות"],
      ],
    },
  ]),

  chapter("etiquette", 11, "כללי התנהגות ביפן", "🎎", [
    {
      title: "מה לעשות ולמה",
      rules: [
        ["🙇", "קידה כשמברכים", "קידה קלה של הראש = כבוד. לא חובה לקוד עמוק כמו היפנים."],
        ["👟", "להוריד נעליים לפני הכניסה", "בכל בית, ריוקאן ומקדש מורידים נעליים. לחכות שיגידו לכם."],
        ["🔇", "שקט ברכבת", "אין שיחות טלפון, מוזיקה רק באוזניות, בלי רעש מוגזם."],
        ["🚭", "לעשן רק באזורים מיועדים", "עישון ברחוב ברוב הערים = קנס! לחפש 喫煙所 (kitsuenjo)."],
        ["💴", "מזומן עדיף", "הרבה מקומות לא מקבלים כרטיסי אשראי. כדאי להחזיק מזומן."],
        ["🗑️", "אין פחים ברחוב", "שומרים את האשפה עד שמוצאים פח (ליד חנויות נוחות כמו 7-Eleven)."],
        ["🍜", "מותר להשמיע קולות אוכל", "סירבול נודלס בקול = מחמאה לשף!"],
        ["♨️", "באונסן - בלי בגד ים", "אונסן מסורתי = עירום מלא. לכסות קעקועים אם יש."],
        ["🤲", "לתת ולקחת בשתי ידיים", "כרטיסי ביקור, כסף, מתנות - תמיד בשתי ידיים."],
        ["🏷️", "לא להתמקח על מחירים", "ביפן מחיר = מחיר. לא נהוג להתמקח."],
      ],
    },
  ]),

  chapter("sensitive", 12, "מה לא לומר - מילים רגישות", "🚫", [
    {
      title: "מילים ונושאים להימנע מהם",
      important: true,
      tone: "avoid",
      phrases: [
        ["麻薬", "mayaku", "סמים (כל סוג, חוקי או לא)", "⚠️ 3-7 שנות מאסר"],
        ["マリファナ / 大麻", "marihuana / taima", "מריחואנה - אסורה לחלוטין", "אפס סובלנות ביפן"],
        ["処方箋の薬", "shohōsen no kusuri", "תרופות מרשם בלי אישור", "⚠️ להביא מסמכים (מרשם)"],
        ["畜生 / バカ野郎", "chikushō / baka yarō", "קללה חזקה", "עלבון חמור"],
        ["猥褻", "waisetsu", "תוכן מיני בפומבי", "עלול להיחשב פוגעני"],
        ["第二次世界大戦", "daini-ji sekai taisen", "מלחמת העולם השנייה", "רגיש מאוד, להימנע"],
        ["天皇陛下", "tennō heika", "הקיסר (לא לבקר)", "כבוד מלא"],
        ["日本の政治", "nihon no seiji", "פוליטיקה יפנית פנימית", "⚠️ לא לגעת בזה כזר"],
        ["やくざ", "yakuza", "יאקוזה - לא בפומבי", "רק בהקשר תרבותי"],
        ["ナイフ / 武器", "naifu / buki", "סכין / נשק", "מעצר מיידי אם מוצאים"],
        ["差別", "sabetsu", "גזענות (כלפי מישהו)", "גינוי חברתי חריף"],
        ["国の嘲笑", "kuni no chōshō", "ללעוג למדינה או לעם", "לא מומלץ"],
      ],
    },
    {
      title: "מה כן מותר לדבר עליו - גרסה ניטרלית",
      tone: "ok",
      phrases: [
        ["ミルクアレルギーです", "miruku arerugī desu", "להסביר שיש אלרגיה (חלב)", "מקובל ומובן"],
        ["体調はどうですか", "taichō wa dō desu ka", "לשאול על מצב הבריאות", "נחמד לשאול"],
        ["仕事 / 勉強", "shigoto / benkyō", "לשאול על עבודה / לימודים", "שיחה רגילה"],
        ["スポーツ / サッカー", "supōtsu / sakkā", "שיחה על ספורט / כדורגל", "פותח שיחה מצוין"],
        ["アニメ / 文化", "anime / bunka", "שיחה על אנימה ותרבות", "אהוב על יפנים"],
        ["お天気 / 気候", "otenki / kikō", "שיחה על מזג האוויר", "נושא אוניברסלי"],
        ["イスラエルからです", "isuraeru kara desu", "לומר שאנחנו מישראל", "בדרך כלל מתקבל בחיוב"],
      ],
    },
  ]),

  chapter("grammar", 13, "דקדוק בסיסי", "📖", [
    {
      title: "מבנה משפט יפני",
      intro: [
        "יפנית: נושא + מושא + פועל (הפוך מעברית!)",
        "עברית: אני אוהב סושי",
        "יפנית: 私は寿司が好きです (watashi wa sushi ga suki desu)",
        "התבנית: [נושא] wa [מה] ga [פועל] desu",
      ],
    },
    {
      title: "רמות נימוס - desu/masu מול צורה קצרה",
      intro: [
        "מנומס (לזרים, חנויות, מלונות): [פועל] + desu / masu",
        "יומיומי (חברים, בני גיל): בלי desu / masu",
        "דוגמה מנומסת: tabemasu (אני אוכל) / ii desu (זה בסדר)",
      ],
    },
    {
      title: "ימות השבוע",
      phrases: [
        ["日曜日", "nichiyōbi", "ראשון"],
        ["月曜日", "getsuyōbi", "שני"],
        ["火曜日", "kayōbi", "שלישי"],
        ["水曜日", "suiyōbi", "רביעי"],
        ["木曜日", "mokuyōbi", "חמישי"],
        ["金曜日", "kin'yōbi", "שישי"],
        ["土曜日", "doyōbi", "שבת"],
      ],
    },
    {
      title: "שעות ומחיר - בסיס",
      intro: [
        "שעה: [מספר] ji. לדוגמה: sanji = 3:00",
        "מחיר: [מספר] en. לדוגמה: sanzen-hyaku en = ¥3,100",
        "כמה?: ikura (מחיר) / nanjikan (כמה שעות) / ikutsu (כמה יחידות)",
      ],
      phrases: [
        ["大きい", "ōkii", "גדול"],
        ["小さい", "chiisai", "קטן"],
        ["速い", "hayai", "מהיר"],
        ["遅い", "osoi", "איטי"],
      ],
    },
  ]),

  chapter("extra", 14, "ביטויים שימושיים נוספים", "⭐", [
    {
      title: "מה שכיף לדעת",
      phrases: [
        ["行きましょう", "ikimashō", "יאללה! / בואו!"],
        ["もうすぐ", "mō sugu", "כבר כמעט שם!"],
        ["何が起きていますか", "nani ga okite imasu ka", "מה קורה כאן?"],
        ["試してみていいですか", "tameshite mite ii desu ka", "אפשר לנסות?"],
        ["これを買いたいです", "kore o kaitai desu", "אני רוצה לקנות את זה"],
        ["もっと大きいサイズはありますか", "motto ōkii saizu wa arimasu ka", "יש מידה גדולה יותר?"],
        ["袋をお願いします", "fukuro o onegaishimasu", "שקית בבקשה"],
        ["プレゼント向けの包みはできますか", "purezento muke no tsutsumi wa dekimasu ka", "אפשר אריזת מתנה?"],
        ["WiFiはフリーですか", "WiFi wa furī desu ka", "יש WiFi חינם?"],
        ["楽しそうですね", "tanoshisō desu ne", "נשמע כיף!"],
        ["素晴らしい", "subarashii", "מדהים!"],
        ["素敵ですね", "suteki desu ne", "איזה יופי!"],
        ["翻訳してください", "hon'yaku shite kudasai", "תרגום בבקשה"],
        ["グーグルマップ", "Gūguru Mappu", "גוגל מפות"],
        ["インターネット / 4G", "intānetto / yon-jī", "אינטרנט / 4G"],
      ],
    },
  ]),

  chapter("signs", 15, "תמרורים יפניים", "🚦", [
    {
      title: "קבוצה 1: עצור, תן קדימה, מעבר חציה - הכי חשוב!",
      important: true,
      signs: [
        ["stop", "止まれ", "tomare / STOP", "עצור - חובה לעצור עצירה מלאה לפני הקו", "חובה על פי חוק"],
        ["yield", "徐行", "jokō", "האט ונסע בזהירות"],
        ["crosswalk", "横断歩道", "ōdan hodō", "מעבר חציה להולכי רגל"],
        ["one-way", "一方通行", "ippō tsūkō", "חד סטרי - לנסוע רק בכיוון החץ"],
      ],
    },
    {
      title: "קבוצה 2: איסורי נסיעה - אסור לעשות",
      signs: [
        ["no-entry", "進入禁止", "shinnyū kinshi", "כניסה אסורה - כביש חד סטרי נגדי"],
        ["no-u-turn", "転回禁止", "tenkai kinshi", "פניית פרסה (U-turn) אסורה"],
        ["no-right-turn", "右折禁止", "usetsu kinshi", "פנייה ימינה אסורה"],
        ["no-left-turn", "左折禁止", "sasetsu kinshi", "פנייה שמאלה אסורה"],
        ["no-vehicles", "車両通行禁止", "sharyō tsūkō kinshi", "כלי רכב אסורים - אין מעבר"],
        ["no-horn", "警笛禁止", "keiteki kinshi", "צפירה אסורה"],
        ["no-bicycles", "自転車通行禁止", "jitensha tsūkō kinshi", "אופניים אסורים"],
      ],
    },
    {
      title: "קבוצה 3: מגבלות מהירות - לפי אזור",
      intro: [
        "שכונה שקטה: 30 קמ\"ש | עיר רגילה: 50 קמ\"ש | כביש ראשי: 60 קמ\"ש | כביש מהיר: 80-100 קמ\"ש",
        "⚠️ מצלמות מהירות נפוצות מאוד ביפן - דוחות מגיעים גם לתיירים!",
      ],
      signs: [
        ["speed-30", "最高速度30", "saikō sokudo 30", "מהירות מרבית - 30 קמ\"ש (שכונות)"],
        ["speed-50", "最高速度50", "saikō sokudo 50", "מהירות מרבית - 50 קמ\"ש (עיר)"],
        ["speed-60", "最高速度60", "saikō sokudo 60", "מהירות מרבית - 60 קמ\"ש (כביש רגיל)"],
        ["speed-80", "最高速度80", "saikō sokudo 80", "מהירות מרבית - 80 קמ\"ש (כביש מהיר)"],
      ],
    },
    {
      title: "קבוצה 4: חניה - מה מותר ומה אסור",
      signs: [
        ["no-parking", "駐車禁止", "chūsha kinshi", "חניה אסורה"],
        ["no-stopping", "停車禁止", "teisha kinshi", "עצירה אסורה - אפילו לרגע"],
        ["parking", "駐車場", "chūshajō", "חניה מותרת - שלט כחול"],
      ],
    },
    {
      title: "קבוצה 5: אזהרות וסימוני דרך",
      signs: [
        ["warning", "注意", "chūi / WARNING", "אזהרה כללית - להיזהר בהמשך"],
        ["railroad-crossing", "踏切あり", "fumikiri ari", "מפגש מסילת רכבת בהמשך"],
        ["intersection", "交差点あり", "kōsaten ari", "צומת בהמשך"],
      ],
    },
    {
      title: "קבוצה 6: כיוונים, שירותים ויציאות",
      signs: [
        ["exit", "出口", "deguchi / EXIT", "יציאה מכביש מהיר"],
        ["expressway", "高速道路", "kōsoku dōro", "כביש מהיר - אוטוסטרדה (בתשלום)"],
        ["keep-left", "左側通行", "hidari-gawa tsūkō", "נוסעים בצד שמאל! (בישראל: ימין)"],
      ],
    },
    {
      title: "כללי נהיגה - 10 דברים חשובים לדעת ביפן",
      important: true,
      rules: [
        ["🚗", "נוסעים בצד שמאל!", "ההפך מישראל, ההגה מימין. כדאי להתרגל לפני שיוצאים לדרך."],
        ["🍺", "אפס אלכוהול לנהגים", "חוק קפדני מאוד ביפן - אפילו טיפה אחת = עצירה ומעצר."],
        ["📱", "טלפון ביד = קנס", "נהיגה עם טלפון ביד גוררת קנס גבוה ונקודות. לא נוגעים."],
        ["🟢", "חץ ירוק = מותר גם באדום", "רמזור עם חץ ירוק - אפשר להמשיך בכיוון החץ גם כשהאור אדום."],
        ["🦺", "חגורה לכולם", "חגורת בטיחות חובה לנוסעים מלפנים ומאחור."],
        ["🚑", "לפנות לרכב חירום", "כשרואים אמבולנס או כבאית - לפנות ולעצור בצד מיד."],
        ["⛽", "בתחנות דלק עוזרים לך", "בהרבה תחנות הצוות מתדלק ומנגב את השמשה. מנומס מאוד."],
        ["🛣️", "כביש מהיר = בתשלום", "כבישים מהירים בתשלום. לברר בהשכרה מראש על כרטיס ETC."],
        ["⛰️", "כבישי הרים - זהירות", "נסיעה איטית, בלי עקיפות, ובגשם להאט עוד יותר."],
        ["☎️", "מספרי חירום", "משטרה: 110 | אמבולנס וכבאות: 119 | חירום בכביש המהיר: \u2066#9910\u2069"],
      ],
    },
  ]),
]
