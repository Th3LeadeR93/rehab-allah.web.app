# Athan Audio Files

Place the following MP3 files here for the Athan preview feature:

1. `athan_abdul_basit.mp3` — الشيخ عبد الباسط عبد الصمد
2. `athan_mustafa_ismail.mp3` — الشيخ مصطفى إسماعيل
3. `athan_madinah.mp3` — أذان المسجد النبوي
4. `athan_aqsa.mp3` — أذان المسجد الأقصى

## Source

Copy these files from `android/app/src/main/res/raw/`.
The native notification system references the `res/raw/` files directly,
while the web UI preview uses these copies in `public/audio/`.
