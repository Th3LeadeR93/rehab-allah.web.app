export interface ChangelogHighlight {
  id: string;
  icon: string;
  title: string;
  description: string;
}

export const APP_RELEASE_INFO = {
  version: "1.5.7",
  versionCode: 31,
  sizeText: "22.6 ميجابايت",
  apkUrl: "https://github.com/Th3LeadeR93/rehab-allah.web.app/releases/download/v1.5.7/rehab-allah-v1.5.7.apk",
  apkFileName: "rehab-allah-v1.5.7.apk",
  releaseTitle: "سجل ميزات وتحديثات الإصدار 1.5.7",
  highlights: [
    {
      id: "friday_mode",
      icon: "🕌",
      title: "الوضع الخاص بيوم الجمعة للأذكار",
      description: "تفعيل تلاوة خاشعة للآية الكريمة ﴿إن الله وملائكته يصلون على النبي...﴾ نهاراً، وكتالوج نصوص مخصوص بسورة الكهف وفضائل الجمعة وساعة الاستجابة حتى أذان المغرب.",
    },
    {
      id: "silent_pre_athan",
      icon: "🔕",
      title: "كتم نغمة تنبيه النظام",
      description: "كتم نغمة رنين النظام تماماً أثناء التنبيهات الصوتية التمهيدية (قبل الأذان بـ 15 دقيقة) لمنع تداخل الأصوات مع النطق البشري.",
    },
    {
      id: "instant_prayer_transition",
      icon: "⏱️",
      title: "الانتقال اللحظي الفوري للعداد الذهبي",
      description: "بمجرد تسجيل الصلاة (من الإشعار أو داخل التطبيق) تنتهي نافذة الصلاة فوراً ويتحول الإشعار لحظياً إلى العداد التنازلي الذهبي للصلاة القادمة.",
    },
    {
      id: "collision_prevention",
      icon: "🛡️",
      title: "منع تصادم الأذكار مع الأذان",
      description: "إلغاء وتخطي تشغيل الأذكار الصوتية الدورية تلقائياً في حال كان الأذان أو دعاء الشيخ الشعراوي قيد التشغيل منعاً لتداخل الصوت.",
    },
    {
      id: "clean_tracker",
      icon: "📿",
      title: "تبسيط كارت متتبع الصلوات اليومية",
      description: "تخصيص كارت المتتبع بنقاء لتسجيل أداء الفروض ونسبة الإنجاز، مع حصر خيارات كتم الأذان داخل كروت المواقيت وقائمة الإعدادات.",
    },
    {
      id: "hourly_azkar",
      icon: "⏰",
      title: "تكرار الأذكار الافتراضي كل ساعة",
      description: "ضبط التكرار الافتراضي للتذكير الدوري بالأذكار ليصبح كل 60 دقيقة، مع تطبيق ترحيل تلقائي وسلس لكافة مستخدمي التطبيق السابقين.",
    },
  ] as ChangelogHighlight[],
};
