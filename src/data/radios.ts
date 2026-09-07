export interface RadioStation {
  id: string;
  name: string;
  category: "main" | "reciters" | "special";
  description: string;
  primaryUrl: string;
  fallbackUrls?: string[];
  icon?: string;
}

export const ISLAMIC_RADIOS: RadioStation[] = [
  {
    id: "cairo-radio",
    name: "إذاعة القرآن الكريم من القاهرة",
    category: "main",
    description: "البث المباشر لإذاعة القرآن الكريم من جمهورية مصر العربية",
    primaryUrl: "https://service.webvideocore.net/CL1olYogIrDWvwqiIKK7eCxOS4PStqG9DuEjAr2ZjZQtvS3d4y9r0cvRhvS17SGN/a_7a4vuubc6mo8.m3u8",
    fallbackUrls: [
      "https://stream.radiojar.com/8s5u8xwwwn0uv",
      "https://backup.qurango.net/radio/mix"
    ],
    icon: "📻",
  },
  {
    id: "saudi-radio",
    name: "إذاعة القرآن الكريم - مكة المكرمة",
    category: "main",
    description: "بث مباشر مستمر من المملكة العربية السعودية",
    primaryUrl: "https://stream.radiojar.com/0tpy1h0kxtzuv",
    fallbackUrls: ["https://backup.qurango.net/radio/saud_alshuraim"],
    icon: "🕋",
  },
  {
    id: "abdulbasit-radio",
    name: "إذاعة الشيخ عبد الباسط عبد الصمد",
    category: "reciters",
    description: "تلاوات نادرة ومجودة للشيخ عبد الباسط رحمه الله على مدار 24 ساعة",
    primaryUrl: "https://backup.qurango.net/radio/abdulbasit_abdulsamad_mojawwad",
    fallbackUrls: ["https://backup.qurango.net/radio/abdulbasit_abdulsamad"],
    icon: "🎙️",
  },
  {
    id: "minshawi-radio",
    name: "إذاعة الشيخ محمد صديق المنشاوي",
    category: "reciters",
    description: "تلاوات خاشعة ومجودة للشيخ المنشاوي رحمه الله",
    primaryUrl: "https://backup.qurango.net/radio/mohammed_siddiq_alminshawi_mojawwad",
    fallbackUrls: ["https://backup.qurango.net/radio/mohammed_siddiq_alminshawi"],
    icon: "🎙️",
  },
  {
    id: "hussary-radio",
    name: "إذاعة الشيخ محمود خليل الحصري",
    category: "reciters",
    description: "المصحف المعلم والمرتل شيخ عموم المقارئ المصرية",
    primaryUrl: "https://backup.qurango.net/radio/mahmoud_khalil_alhussary",
    fallbackUrls: ["https://backup.qurango.net/radio/mahmoud_khalil_alhussary_mojawwad"],
    icon: "🎙️",
  },
  {
    id: "alafasy-radio",
    name: "إذاعة الشيخ مشاري راشد العفاسي",
    category: "reciters",
    description: "تلاوات عذبة بصوت القارئ مشاري العفاسي",
    primaryUrl: "https://backup.qurango.net/radio/mishary_alafasi",
    icon: "🎙️",
  },
  {
    id: "dosari-radio",
    name: "إذاعة الشيخ ياسر الدوسري",
    category: "reciters",
    description: "تلاوات الحرم المكي الشريف بصوت الشيخ ياسر الدوسري",
    primaryUrl: "https://backup.qurango.net/radio/yasser_aldosari",
    icon: "🎙️",
  },
  {
    id: "athkar-radio",
    name: "إذاعة أذكار الصباح والمساء",
    category: "special",
    description: "أذكار وتسابيح اليوم والليلة لحفظ وتحصين المسلم",
    primaryUrl: "https://backup.qurango.net/radio/athkar_sabah",
    fallbackUrls: ["https://backup.qurango.net/radio/athkar_masa"],
    icon: "📿",
  },
  {
    id: "roqiah-radio",
    name: "إذاعة الرقية الشرعية",
    category: "special",
    description: "آيات الشفاء والرقية الشرعية بأصوات نخبة من القراء",
    primaryUrl: "https://backup.qurango.net/radio/roqiah",
    icon: "🛡️",
  },
  {
    id: "sakeenah-radio",
    name: "إذاعة آيات السكينة والطمأنينة",
    category: "special",
    description: "تلاوات هادئة لراحة القلب والسكينة النفسية",
    primaryUrl: "https://backup.qurango.net/radio/sakeenah",
    icon: "🕊️",
  },
  {
    id: "tafseer-radio",
    name: "إذاعة تفسير القرآن الكريم",
    category: "special",
    description: "شروحات وتفاسير ميسرة لآيات الذكر الحكيم",
    primaryUrl: "https://backup.qurango.net/radio/tafseer",
    icon: "📖",
  },
];
