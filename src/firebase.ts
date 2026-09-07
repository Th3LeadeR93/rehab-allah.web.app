import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAmXyptKkErYA7FWnc1GFjIdK0-3oG20_E",
  authDomain: "rehab-allah.firebaseapp.com",
  projectId: "rehab-allah",
  storageBucket: "rehab-allah.firebasestorage.app",
  messagingSenderId: "582365033258",
  appId: "1:582365033258:web:2baaf65c26668f76742453",
  measurementId: "G-0RBS0G0X5X"
};

// تشغيل الفايربيز
const app = initializeApp(firebaseConfig);

// تصدير الخدمات لتشغيل قاعدة البيانات والتسجيل والإحصائيات
export const db = getFirestore(app);
export const auth = getAuth(app);
export const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;

export default app;