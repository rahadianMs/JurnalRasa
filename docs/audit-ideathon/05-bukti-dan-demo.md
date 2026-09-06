# Bukti Audit, Pengujian & Demo Submission

Tanggal: 6 September 2026. Baseline source: commit `22c26a5`. Dokumen ini memisahkan hasil yang benar-benar diperiksa dari pekerjaan yang masih harus dilakukan.

## Hasil aktual sesi audit

| Pemeriksaan | Hasil | Batas kesimpulan |
|---|---|---|
| Source backend, Auth, Firestore rules, state/chat, UI, README, GEMINI.md, env example | Selesai | Menemukan cacat pada kode; bukan bukti keadaan cloud |
| `npm run lint` | Lolos TypeScript `tsc --noEmit` | Script bernama lint ini bukan ESLint, tes keamanan atau E2E |
| `npm run build` | Lolos setelah dijalankan di luar pembatasan filesystem sandbox | Percobaan pertama gagal karena akses direktori esbuild, bukan diagnosis bug aplikasi |
| Output build frontend | JS 1,167.04 kB, gzip 310.53 kB; CSS 51.84 kB, gzip 9.57 kB | Ada warning chunk di atas 500 kB; belum ada pengukuran Core Web Vitals |
| Output backend | server.cjs sekitar 50.6 kB dan sourcemap 89.7 kB di dist | Static root produksi saat ini mencakup artefak ini; perlu pemisahan |
| `npm audit --omit=dev --json` | Tidak berhasil: ENOLOCK karena tidak ada package-lock/shrinkwrap yang diperlukan npm audit | Repo memiliki bun.lock; **tidak boleh menyimpulkan dependency bebas vulnerability** |
| Render UI desktop | Komponen App asli dirender statis dengan CSS build dan diperiksa dalam browser | State awal/data contoh; React effects tidak dijalankan |
| Render UI mobile 390 × 844 | Diperiksa; catatan belum terlihat di layar pertama | Bukan emulasi perangkat nyata atau pengujian keyboard virtual |
| Kontras teks putih pada #FF5533 | Sekitar 3.18:1 lewat perhitungan luminance sRGB | Bukan audit kontras seluruh aplikasi |
| Firebase Emulator / A-B account test | Belum dijalankan | Temuan rules berdasarkan source dan logika kondisi |
| Google sign-in, Gemini live, Maps live, persistensi Firestore | Belum dijalankan | Keberhasilan fungsi live tidak diberikan sebagai kredit terverifikasi |
| Secret Manager, IAM, key restrictions, rules deployed | Belum diperiksa | Memerlukan bukti konfigurasi cloud |
| AI Studio setup/provenance | Belum diperiksa | GEMINI.md/telemetry header bukan bukti pemasangan instruksi |

Audit ini tidak mengubah source aplikasi, aturan Firestore, konfigurasi cloud, atau secret. File yang diserahkan adalah paket Markdown audit. Build hanya menghasilkan artefak lokal; pratinjau statis sementara digunakan untuk inspeksi tampilan.

Pada pemeriksaan akhir ditemukan perubahan working tree pada server.ts yang bukan dibuat oleh audit: pemuatan .env.local dan fallback VITE_GOOGLE_MAPS_API_KEY untuk Maps/config. Perubahan ini dipertahankan. Nomor baris rujukan mengikuti snapshot awal dan dapat bergeser satu baris setelah perubahan tersebut. Temuan endpoint key tetap berlaku; jika fallback VITE diisi dan dibaca frontend, paparan melalui bundle menjadi jalur tambahan. Nilai env tidak diperiksa. Hasil build di atas adalah hasil pada saat perintah dijalankan, bukan sertifikasi terhadap perubahan yang terjadi sesudahnya.

## Paket bukti yang perlu disiapkan

| Kode | Bukti | Isi yang harus terlihat | Status |
|---|---|---|---|
| EV-01 | Custom Instructions AI Studio | Proyek, isi directives, tanggal/versi, tanpa credential | Belum tersedia |
| EV-02 | Threat model sebelum iterasi | Risiko → kontrol → uji untuk satu perubahan nyata | Belum tersedia |
| EV-03 | Demo Firebase sign-in | Login Google sukses, identitas akun uji, login mudah ditemukan saat guest | Belum tersedia |
| EV-04 | Gemini multi-turn | Giliran lanjutan memakai konteks sebelumnya; model berhasil diketahui di backend | Belum tersedia |
| EV-05 | History dan summary otomatis | Dokumen owner, timestamps/version, hasil reload/login ulang | Belum tersedia |
| EV-06 | Isolasi negatif | A boleh; B dan unauth ditolak, termasuk list dan writes | Belum tersedia |
| EV-07 | Secret Manager | Nama/reference/version, binding revision, IAM runtime; **tanpa secret value** | Belum tersedia |
| EV-08 | Browser secret hygiene | Response/config/bundle bebas server secret; artefak backend tidak publik | Belum tersedia |
| EV-09 | Enhancement AI Studio | Prompt, threat model, diff fitur, dan hasil uji/demo | Belum tersedia |
| EV-10 | Deployment dapat direproduksi | URL app, revision/commit, runtime config non-secret, build/start/health | Belum tersedia |
| EV-11 | UI sebelum/sesudah | Ukuran viewport sama, data uji sama, hasil tugas pengguna | Before diperiksa; after belum dibuat |
| EV-12 | Failure handling | Provider gagal, write gagal, retry, logout ketika request belum selesai | Belum tersedia |

Gunakan akun dan data sintetis. Samarkan email, token, cookie dan isi rahasia di screenshot/log. Nama resource dan secret reference cukup untuk membuktikan binding; jangan menunjukkan payload secret.

## Skenario pengujian yang harus dijalankan setelah perbaikan

### T-01 — Autentikasi dan pergantian akun

Masuk sebagai A, simpan catatan bertanda “DATA UJI A”. Logout saat listener/request AI masih berjalan, lalu login B dengan jaringan diperlambat. Harapan: data/draft/selectedPlace A langsung hilang dan respons terlambat tidak masuk ke state B. Ulangi saat listener baru gagal. Periksa jalur guest ke login Google.

### T-02 — Isolasi Firestore dan backend

Di emulator/environment uji, coba get/list/create/update/delete path A sebagai A, B, anonymous valid milik UID lain, dan tanpa auth. Owner hanya boleh operasi sesuai schema; lainnya ditolak. Uji subcollection messages dan summaries secara eksplisit. Uji API conversationId milik A dengan token B. Jangan hanya mengetes tombol yang disembunyikan di UI.

### T-03 — Multi-turn dan persistensi

Kirim “Saya ingin makan di tempat dari wishlist”, lanjutkan dengan batas budget, lalu minta pilihan berdasarkan percakapan tadi. Verifikasi jawaban memang memakai konteks. Pastikan messages dan summary tersimpan otomatis tanpa klik simpan. Tutup Taste Finder, buka lagi, reload, dan login ulang; history harus tetap ada.

### T-04 — Ringkasan gagal dan retry

Mock summarization gagal setelah pesan/jawaban berhasil disimpan. Percakapan tidak hilang; summaryStatus menunjukkan gagal/pending sesuai desain. Retry tidak menggandakan message. Jalankan dua request berdekatan; summaryVersion akhir harus meliputi pesan terbaru.

### T-05 — Secrets dan batas API

Tanpa token, semua endpoint Gemini/Maps privat mengembalikan 401 sebelum fetch upstream. Inspect bundle, response konfigurasi, dan error untuk nama field secret tanpa menyalin valuenya ke laporan. Coba path server.cjs/server.cjs.map di deployment uji: tidak boleh mengembalikan source server. Cocokkan Secret Manager binding dengan revision yang didemokan.

### T-06 — Parser dan geocoding

URL normal yang didukung menghasilkan preview yang dapat dikoreksi. URL host palsu atau redirect privat ditolak sebelum fetch. Saat social provider memblokir, caption manual ditawarkan dengan penjelasan. Saat Maps gagal, tidak ada rating rekaan atau pin perkiraan yang dilabeli terverifikasi.

### T-07 — Penyimpanan dan komunitas

Simpan privat dengan publikasi nonaktif; hanya dokumen privat yang berubah. Aktifkan publikasi tempat; periksa hanya field yang dijelaskan masuk publik. Simpan/retry request yang sama dua kali; counter tidak berlipat. Pengguna lain tidak dapat overwrite/delete dokumen publik melalui client.

### T-08 — Aksesibilitas dan mobile

Gunakan Tab/Shift+Tab/Enter/Escape untuk login, filter, modal dan chat. Fokus modal terkunci dan kembali ke pemicu. Nama input dan ikon dapat dikenali pembaca layar. Periksa 360px, 390px, tablet, desktop, zoom 200%, reduced motion, dan keyboard virtual pada perangkat. Dokumentasikan hasil; jangan memberi label WCAG compliant hanya dari pemeriksaan parsial.

## Naskah demo yang disarankan: sekitar 5 menit

| Waktu | Yang ditampilkan | Yang dibuktikan |
|---|---|---|
| 0:00–0:35 | Masalah bookmark kuliner, lalu konfigurasi Custom Instructions | Konteks produk dan Phase 1 |
| 0:35–1:05 | Firebase Google sign-in akun A; jurnal kosong/riwayat A | Identitas nyata dan scope privat |
| 1:05–1:55 | Simpan dari Sosmed, koreksi preview, simpan dan lihat titik | Enhancement berguna; AI tidak diasumsikan selalu benar |
| 1:55–2:55 | Percakapan Taste Finder dua/tiga giliran | Gemini multi-turn berbasis jurnal |
| 2:55–3:30 | Summary otomatis, reload dan buka riwayat | Persistensi yang benar-benar berjalan |
| 3:30–4:15 | Akun B kosong/berbeda dan hasil tes akses A ditolak | Isolasi data, termasuk bukti negatif |
| 4:15–4:45 | Secret Manager binding dan service account, tanpa value | Secure key management |
| 4:45–5:00 | Satu failure/retry singkat dan manfaat utama | Kesiapan menghadapi kegagalan |

Jangan mengklaim “zero leakage” hanya karena akun B melihat UI berbeda. Tampilkan hasil tes otorisasi. Jangan menyamarkan fallback heuristik/parser manual sebagai output Gemini yang berhasil.

## README submission yang perlu diperbaiki

- Deskripsi produk dan mapping Phase 1–3.
- Diagram sesuai kode akhir; source audit saat ini memakai Maps JavaScript, bukan Leaflet.
- Endpoint aktual sesuai implementasi akhir.
- Prosedur install sesuai package manager/lockfile yang dipilih; build/start dan runtime produksi.
- Instruksi setup Firebase provider, database ID, rules deployment dan tes emulator.
- Secret Manager binding dan IAM tanpa secret values.
- Penjelasan data privat/publik, mode guest, retensi/deletion dan keterbatasan parser.
- URL deployment, commit/revision yang didemokan, dan tautan bukti/test results.
- Bedakan fitur yang bekerja, belum diverifikasi, dan rencana.

## Sumber rujukan

Brief yang diberikan pengguna tetap menjadi acuan utama. Tautan berikut digunakan untuk memeriksa interpretasi teknis; bukan bukti deployment Jurnal Rasa:

- [Codelab challenge Google](https://codelabs.developers.google.com/codelabs/cloud-run/cloud-run-ai-challenge?hl=en)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/rules-conditions)
- [Firebase ID token verification](https://firebase.google.com/docs/auth/admin/verify-id-tokens)
- [Cloud Run secrets](https://cloud.google.com/run/docs/configuring/services/secrets)
- [Firebase web API keys](https://firebase.google.com/docs/projects/api-keys)
- [Google Maps key security](https://developers.google.com/maps/api-security-best-practices)
- [W3C contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [W3C modal dialogs](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
