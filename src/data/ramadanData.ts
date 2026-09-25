/**
 * ramadanData.ts
 * -----------------------------------------------------------------------------
 * Static data for Ramadan Hub (واحة رمضان):
 *  - 30 Ajza' definition with starting Surah, Ayah, and Arabic title
 *  - Pre-Ramadan virtues & preparation tips
 *  - Prophetic supplications for Ramadan, Fasting, and Iftar
 *  - Spiritual preparation checklist items
 * -----------------------------------------------------------------------------
 */

export interface JuzInfo {
  juzNumber: number;
  name: string;
  startSurahId: number;
  startSurahName: string;
  startAyah: number;
}

export const RAMADAN_JUZ_LIST: JuzInfo[] = [
  { juzNumber: 1, name: "الجزء الأول (الم)", startSurahId: 1, startSurahName: "الفاتحة", startAyah: 1 },
  { juzNumber: 2, name: "الجزء الثاني (سيقول)", startSurahId: 2, startSurahName: "البقرة", startAyah: 142 },
  { juzNumber: 3, name: "الجزء الثالث (تلك الرسل)", startSurahId: 2, startSurahName: "البقرة", startAyah: 253 },
  { juzNumber: 4, name: "الجزء الرابع (لن تنالوا)", startSurahId: 3, startSurahName: "آل عمران", startAyah: 93 },
  { juzNumber: 5, name: "الجزء الخامس (والمحصنات)", startSurahId: 4, startSurahName: "النساء", startAyah: 24 },
  { juzNumber: 6, name: "الجزء السادس (لا يحب الله)", startSurahId: 4, startSurahName: "النساء", startAyah: 148 },
  { juzNumber: 7, name: "الجزء السابع (وإذا سمعوا)", startSurahId: 5, startSurahName: "المائدة", startAyah: 82 },
  { juzNumber: 8, name: "الجزء الثامن (ولو أننا)", startSurahId: 6, startSurahName: "الأنعام", startAyah: 111 },
  { juzNumber: 9, name: "الجزء التاسع (قال الملأ)", startSurahId: 7, startSurahName: "الأعراف", startAyah: 88 },
  { juzNumber: 10, name: "الجزء العاشر (واعلموا)", startSurahId: 8, startSurahName: "الأنفال", startAyah: 41 },
  { juzNumber: 11, name: "الجزء الحادي عشر (يعتذرون)", startSurahId: 9, startSurahName: "التوبة", startAyah: 93 },
  { juzNumber: 12, name: "الجزء الثاني عشر (وما من دابة)", startSurahId: 11, startSurahName: "هود", startAyah: 6 },
  { juzNumber: 13, name: "الجزء الثالث عشر (وما أبرئ)", startSurahId: 12, startSurahName: "يوسف", startAyah: 53 },
  { juzNumber: 14, name: "الجزء الرابع عشر (ربما)", startSurahId: 15, startSurahName: "الحجر", startAyah: 1 },
  { juzNumber: 15, name: "الجزء الخامس عشر (سبحان)", startSurahId: 17, startSurahName: "الإسراء", startAyah: 1 },
  { juzNumber: 16, name: "الجزء السادس عشر (قال ألم)", startSurahId: 18, startSurahName: "الكهف", startAyah: 75 },
  { juzNumber: 17, name: "الجزء السابع عشر (اقترب)", startSurahId: 21, startSurahName: "الأنبياء", startAyah: 1 },
  { juzNumber: 18, name: "الجزء الثامن عشر (قد أفلح)", startSurahId: 23, startSurahName: "المؤمنون", startAyah: 1 },
  { juzNumber: 19, name: "الجزء التاسع عشر (وقال الذين)", startSurahId: 25, startSurahName: "الفرقان", startAyah: 21 },
  { juzNumber: 20, name: "الجزء العشرون (فما كان)", startSurahId: 27, startSurahName: "النمل", startAyah: 56 },
  { juzNumber: 21, name: "الجزء الحادي والعشرون (ولا تجادلوا)", startSurahId: 29, startSurahName: "العنكبوت", startAyah: 46 },
  { juzNumber: 22, name: "الجزء الثاني والعشرون (ومن يقنت)", startSurahId: 33, startSurahName: "الأحزاب", startAyah: 31 },
  { juzNumber: 23, name: "الجزء الثالث والعشرون (وما أنزلنا)", startSurahId: 36, startSurahName: "يس", startAyah: 28 },
  { juzNumber: 24, name: "الجزء الرابع والعشرون (فمن أظلم)", startSurahId: 39, startSurahName: "الزمر", startAyah: 32 },
  { juzNumber: 25, name: "الجزء الخامس والعشرون (إليه يرد)", startSurahId: 41, startSurahName: "فصلت", startAyah: 47 },
  { juzNumber: 26, name: "الجزء السادس والعشرون (حم)", startSurahId: 46, startSurahName: "الأحقاف", startAyah: 1 },
  { juzNumber: 27, name: "الجزء السابع والعشرون (قال فما خطبكم)", startSurahId: 51, startSurahName: "الذاريات", startAyah: 31 },
  { juzNumber: 28, name: "الجزء الثامن والعشرون (قد سمع)", startSurahId: 58, startSurahName: "المجادلة", startAyah: 1 },
  { juzNumber: 29, name: "الجزء التاسع والعشرون (تبارك)", startSurahId: 67, startSurahName: "الملك", startAyah: 1 },
  { juzNumber: 30, name: "الجزء الثلاثون (عمّ)", startSurahId: 78, startSurahName: "النبأ", startAyah: 1 },
];

export interface PreparationTip {
  id: number;
  title: string;
  category: "فضائل" | "تهيئة" | "تزكية" | "سنة";
  text: string;
  source: string;
}

export const RAMADAN_PREPARATION_TIPS: PreparationTip[] = [
  {
    id: 1,
    title: "فضل صيام شعبان والتهيئة لرمضان",
    category: "فضائل",
    text: "عن عائشة رضي الله عنها قالت: «ما رأيت رسول الله صلى الله عليه وسلم استكمل صيام شهر إلا رمضان، وما رأيته أكثر صياما منه في شعبان». وكان السلف يسمون شعبان شهر القراء استعداداً للقرآن في رمضان.",
    source: "صحيح البخاري ومسلم",
  },
  {
    id: 2,
    title: "تصفية القلوب والتوبة النصوح",
    category: "تزكية",
    text: "أعظم ما يستقبل به المؤمن مواسم الطاعات هو التوبة النصوح وتصفية القلب من الشحناء والغل، فإن الأعمال ترفع إلى الله ويُغفر لكل عبد لا يشرك بالله شيئاً إلا المتشاحنين.",
    source: "حديث صحيح",
  },
  {
    id: 3,
    title: "تحديد خطة الختمة القرآنية مسبقاً",
    category: "تهيئة",
    text: "القرآن ورمضان قرينان لا يفترقان: ﴿شَهْرُ رَمَضَانَ الَّذِي أُنزِلَ فِيهِ الْقُرْآنُ﴾. حدد هدفك اليومي قبل دخول الشهر: جزء يومياً لختمة كاملة، أو جزآن لختمتين، واجعل لك ورداً ثابتاً من التدبر.",
    source: "توجيه تربوي",
  },
  {
    id: 4,
    title: "تعويد النفس على قيام الليل",
    category: "سنة",
    text: "ابدأ بركعتين خفيفتين في الثلث الأخير من الليل قبل الفجر، لتهيئة النفس لصلاة التراويح والتهجد دون مشقة، ولتعتاد الاستيقاظ في وقت السحر المبارك.",
    source: "السنة النبوية",
  },
  {
    id: 5,
    title: "بذل الصدقة وتفقد المحتاجين",
    category: "فضائل",
    text: "كان رسول الله صلى الله عليه وسلم أجود الناس، وكان أجود ما يكون في رمضان حين يلقاه جبريل فيدارسه القرآن، فلرسول الله أجود بالخير من الريح المرسلة.",
    source: "صحيح البخاري",
  },
];

export interface RamadanDua {
  id: number;
  title: string;
  arabic: string;
  reference: string;
  reward?: string;
}

export const RAMADAN_DUAS: RamadanDua[] = [
  {
    id: 1,
    title: "دعاء الإفطار المأثور",
    arabic: "ذَهَبَ الظَّمَأُ وَابْتَلَّتِ الْعُرُوقُ، وَثَبَتَ الأَجْرُ إِنْ شَاءَ اللَّهُ",
    reference: "رواه أبو داود وصححه الألباني",
    reward: "سنة مؤكدة عند الفطر",
  },
  {
    id: 2,
    title: "دعاء الفطر الشائع",
    arabic: "اللَّهُمَّ إِنِّي لَكَ صُمْتُ، وَعَلَى رِزْقِكَ أَفْطَرْتُ، فَتَقَبَّلْ مِنِّي إِنَّكَ أَنْتَ السَّمِيعُ الْعَلِيمُ",
    reference: "رواه أبو داود مرسلاً",
  },
  {
    id: 3,
    title: "دعاء ليلة القدر",
    arabic: "اللَّهُمَّ إِنَّكَ عَفُوٌّ كَرِيمٌ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي",
    reference: "رواه الترمذي وصححه",
    reward: "علمه النبي ﷺ لأم المؤمنين عائشة رضي الله عنها",
  },
  {
    id: 4,
    title: "دعاء استهلال الهلال",
    arabic: "اللَّهُ أَكْبَرُ، اللَّهُمَّ أَهِلَّهُ عَلَيْنَا بِالأَمْنِ وَالإِيمَانِ، وَالسَّلامَةِ وَالإِسْلامِ، وَالتَّوْفِيقِ لِمَا يُحِبُّ رَبُّنَا وَيَرْضَى، رَبُّنَا وَرَبُّكَ اللَّهُ",
    reference: "رواه الترمذي والدارمي",
  },
  {
    id: 5,
    title: "دعاء طلب المغفرة والرحمة",
    arabic: "اللَّهُمَّ بَلِّغْنَا رَمَضَانَ، وَأَعِنَّا فِيهِ عَلَى الصِّيَامِ وَالْقِيَامِ، وَتِلاوَةِ الْقُرْآنِ، وَاجْعَلْنَا فِيهِ مِنَ الْمَقْبُولِينَ وَعُتَقَائِكَ مِنَ النَّارِ",
    reference: "من أدعية السلف الصالح",
  },
];

export interface PreparationChecklistItem {
  id: string;
  label: string;
  description: string;
}

export const PREPARATION_CHECKLIST: PreparationChecklistItem[] = [
  {
    id: "qadaa",
    label: "قضاء أيام الصيام السابقة",
    description: "إبراء الذمة من صيام قضاء العام الماضي قبل دخول شهر رمضان.",
  },
  {
    id: "tawbah",
    label: "التوبة النصوح والعفو عن الناس",
    description: "استقبال الشهر بقلب نقي وخالٍ من الخصومة والشحناء.",
  },
  {
    id: "khatma_plan",
    label: "تحديد خطة ختم القرآن وتدبره",
    description: "اختيار عدد الختمات وأوقات التلاوة اليومية وتجهيز المصحف.",
  },
  {
    id: "tahajjud_prep",
    label: "التهيئة لقيام الليل والتراويح",
    description: "تعويد البدن على الاستيقاظ للقيام قبل الفجر وقراءة ورد الليل.",
  },
  {
    id: "sadaqah_intent",
    label: "تخصيص صدقة رمضانية أو إفطار صائم",
    description: "نيل أجر الجود في رمضان تأسياً بالنبي صلى الله عليه وسلم.",
  },
];
