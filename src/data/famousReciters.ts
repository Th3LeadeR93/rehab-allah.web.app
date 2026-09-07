export interface FamousReciterEntry {
  order: number;
  searchTerms: string[];
}

export const FAMOUS_RECITERS_ORDERED: FamousReciterEntry[] = [
  { order: 1, searchTerms: ["عبد الباسط", "عبدالباسط"] },
  { order: 2, searchTerms: ["المنشاوي", "منشاوي"] },
  { order: 3, searchTerms: ["الحصري", "حصري", "محمود خليل"] },
  { order: 4, searchTerms: ["مصطفى إسماعيل", "مصطفى اسماعيل"] },
  { order: 5, searchTerms: ["السديس", "سديس"] },
  { order: 6, searchTerms: ["المعيقلي", "معيقلي", "ماهر"] },
  { order: 7, searchTerms: ["العفاسي", "عفاسي", "مشاري"] },
  { order: 8, searchTerms: ["محمد رفعت", "رفعت"] },
  { order: 9, searchTerms: ["سعد الغامدي", "الغامدي"] },
  { order: 10, searchTerms: ["الشاطري", "شاطري", "أبو بكر"] },
];
