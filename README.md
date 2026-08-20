# 🔥 HabitForge — Personal Habit Tracker (Google Apps Script)

HabitForge adalah aplikasi penjejak kebiasaan (habit tracker) pribadi berbasis **Google Apps Script** dengan tampilan modern, dark mode premium, integrasi **Google Spreadsheet** sebagai database & analitik, serta penulisan log otomatis ke **Google Calendar**.

![HabitForge Dark Mode Mobile UI](https://img.shields.io/badge/UI-Dark%20Mode%20Premium-8b5cf6?style=for-the-badge)
![Google Apps Script](https://img.shields.io/badge/Platform-Google%20Apps%20Script-4285F4?style=for-the-badge&logo=google)
![Google Sheets](https://img.shields.io/badge/Database-Google%20Sheets-34A853?style=for-the-badge&logo=googlesheets)
![Google Calendar](https://img.shields.io/badge/Integration-Google%20Calendar-4285F4?style=for-the-badge&logo=googlecalendar)

---

## ✨ Fitur Utama

- 📱 **Mobile-First & Responsive**: Single Page Application (SPA) berbasis HTML5 + CSS Vanilla (tanpa library berat), cepat dan ringan.
- 🎨 **Mewah & Estetik**: Tema dominan dark mode (`#0a0a0f`) dengan aksen gradient (purple-to-cyan, amber-to-rose), mikro-animasi pulse, checkmark draw, dan shimmer effect.
- 🎯 **3 Tipe Habit**:
  - **Boolean (Ya/Tidak)**: Cukup 1 tap untuk ✅ / ❌.
  - **Target Angka (Quantitative)**: Penjejakan jumlah (misal: minum 8 gelas air).
  - **Durasi (Time)**: Penjejakan waktu (misal: baca buku 30 menit).
- 📅 **Frekuensi Fleksibel**:
  - Harian (*Daily*)
  - X kali per minggu (*Weekly Count*)
  - Hari-hari tertentu (*Specific Days*, misal: Senin, Rabu, Jumat)
- 🔥 **Streak & Auto Streak Freeze**:
  - Perhitungan streak beruntun otomatis.
  - Fitur **Streak Freeze** (2x per bulan, auto-reset tiap tanggal 1) agar streak tidak putus saat berhalangan.
- 📆 **Integrasi Google Calendar (1-Way Write)**:
  - Otomatis membuat event *All-day* di Google Calendar saat habit selesai.
  - Warna event disesuaikan dengan warna habit.
- 📊 **Spreadsheet sebagai Database & Dashboard**:
  - Data tersimpan otomatis di Google Sheets (`Habits`, `Logs`, `Streaks`, `Config`).
  - Halaman `Dashboard` auto-formula untuk analisis langsung dari Google Sheets.
- 📈 **Visualisasi Performa**:
  - *Contribution Graph* 52 minggu (style GitHub).
  - Kalender bulanan interaktif.
  - Chart konsistensi harian dan perbandingan streak terbaik.

---

## 📁 Struktur File Proyek

```
habitTracker/
├── appsscript.json          # Manifest manifest & izin OAuth Google
├── Code.gs                  # Entry point, doGet(), API bridge & triggers
├── SheetService.gs          # Inisialisasi spreadsheet, CRUD data, formula Dashboard
├── HabitService.gs          # CRUD master habit & filter hari ini
├── ConfigService.gs         # Key-value store pengaturan aplikasi
├── LogService.gs            # Logging check-in & uncheck-in harian
├── StreakService.gs         # Perhitungan streak beruntun & logika freeze
├── CalendarService.gs       # Integrasi penulisan ke Google Calendar
├── Utils.gs                 # Helper tanggal, UUID generator & timezone
├── index.html               # Shell HTML utama (SPA)
├── css.html                 # Complete Design System CSS (Dark Mode & Animations)
├── components.html          # Template HTML komponen UI
├── js.html                  # Logika state client, router tab & event handler
├── CONTEXT.md               # Glosarium domain istilah
└── README.md                # Dokumentasi & panduan instalasi
```

---

## 🚀 Panduan Pengaplikasian di Google Apps Script

Ikuti langkah-langkah mudah di bawah ini untuk memasang dan menjalankan HabitForge pada akun Google Anda sendiri:

### Langkah 1: Buat Proyek Google Apps Script Baru

1. Buka [Google Apps Script Dashboard](https://script.google.com/).
2. Klik tombol **+ Proyek Baru** (*New Project*) di pojok kiri atas.
3. Ubah nama proyek (di bagian kiri atas yang bertuliskan *Proyek Tanpa Judul*) menjadi **HabitForge**.

---

### Langkah 2: Aktifkan Manifest File (`appsscript.json`)

1. Di menu sebelah kiri Apps Script editor, klik ikon **Roda Gigi / Settings ⚙️** (*Project Settings*).
2. Centang opsi **"Tampilkan file manifest "appsscript.json" di editor"** (*Show "appsscript.json" manifest file in editor*).
3. Kembali ke editor kode dengan mengklik ikon **Editor `<>`** di sebelah kiri.

---

### Langkah 3: Masukkan Seluruh Kode File

Salin isi dari masing-masing file di folder `habitTracker/` ini ke dalam editor Apps Script:

1. **`appsscript.json`**:
   - Buka file `appsscript.json` di editor, timpa seluruh isinya dengan isi file `habitTracker/appsscript.json`.

2. **File Backend Script (`.gs`)**:
   - Buat file Script baru (klik `+` di sebelah *File* > pilih **Script**) dan beri nama persis seperti berikut (tanpa ekstensi `.gs`):
     - `Code`
     - `SheetService`
     - `HabitService`
     - `ConfigService`
     - `LogService`
     - `StreakService`
     - `CalendarService`
     - `Utils`
   - Salin isi dari masing-masing file `.gs` yang bersesuaian ke file yang telah dibuat.

3. **File Frontend HTML (`.html`)**:
   - Buat file HTML baru (klik `+` di sebelah *File* > pilih **HTML**) dan beri nama persis seperti berikut (tanpa ekstensi `.html`):
     - `index`
     - `css`
     - `components`
     - `js`
   - Salin isi dari masing-masing file `.html` yang bersesuaian.

---

### Langkah 4: Deploy sebagai Web App

1. Di bagian kanan atas editor Apps Script, klik tombol **Terapkan / Deploy** > pilih **Penerapan Baru** (*New Deployment*).
2. Klik ikon roda gigi ⚙️ di sebelah *Pilih jenis* (*Select type*) > pilih **Aplikasi Web** (*Web app*).
3. Isi konfigurasi sebagai berikut:
   - **Deskripsi**: `HabitForge v1.0`
   - **Jalankan sebagai** (*Execute as*): **Saya / Me (`email_anda@gmail.com`)**
   - **Yang memiliki akses** (*Who has access*): **Hanya saya / Only myself** (atau Siapa saja yang memiliki akun Google).
4. Klik **Terapkan / Deploy**.

---

### Langkah 5: Otorisasi Izin Akses Google Account

1. Saat pertama kali deploy, Google akan meminta otorisasi izin (*Authorize access*).
2. Klik **Otorisasi Akses** (*Authorize access*).
3. Pilih akun Google Anda.
4. Jika muncul peringatan *"Google hasn't verified this app"*, klik **Lanjutan / Advanced** > klik **Buka HabitForge (tidak aman) / Go to HabitForge (unsafe)**.
5. Klik **Izinkan / Allow** untuk memberikan izin akses Google Spreadsheet dan Google Calendar.

---

### Langkah 6: Jalankan & Pasang Trigger Otomatis

1. Setelah otorisasi selesai, Anda akan mendapatkan URL Web App (berakhiran `/exec`).
2. Buka URL Web App tersebut di browser handphone atau komputer Anda.
3. Aplikasi akan otomatis membuat Google Spreadsheet baru bernama **"HabitForge Data"** di Google Drive Anda saat pertama kali dimuat.
4. Masuk ke halaman **⚙️ Settings** di Web App, lalu klik **"Install Trigger Tengah Malam"** agar sistem otomatis mengecek pemicu streak & freeze harian pada pukul 00:05.
5. (Opsional) Uji koneksi Google Calendar dengan mengklik tombol **Test** di halaman Settings.

---

## 📱 Penggunaan di Smartphone

Untuk pengalaman layaknya aplikasi native di Android / iOS:
1. Buka URL Web App di Chrome (Android) atau Safari (iOS).
2. Pilih menu browser **"Tambahkan ke Layar Utama"** (*Add to Home Screen*).
3. Aplikasi HabitForge kini dapat dibuka langsung dari home screen smartphone Anda!

---

## 📄 Lisensi & Kontribusi

Proyek ini dibuat untuk penggunaan pribadi dan dikembangkan dengan arsitektur bersih. Bebas untuk di-fork, disesuaikan, atau dikembangkan lebih lanjut.

Developed with ❤️ using Google Apps Script.
