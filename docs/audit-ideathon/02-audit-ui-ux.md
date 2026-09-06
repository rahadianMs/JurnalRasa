# Audit UI/UX — Membuat Jurnal Rasa Lebih Jelas

Penilaian heuristik: **4/10**, belum melalui usability test dengan pengguna. Basis: inspeksi source dan render statis komponen asli menggunakan CSS hasil build pada desktop serta viewport mobile 390 × 844. Login, interaksi modal, keyboard virtual, dan state jaringan belum diuji langsung.

## Pendapat juri

Keluhan “terlalu ramai dan belum clear” tepat. Aplikasi memiliki banyak petunjuk visual, tetapi belum menentukan mana yang paling penting. Tombol simpan muncul berulang, navigasi komunitas menempati bidang besar, statistik dihias seperti CTA, dan banner AI menambah satu lapisan sebelum catatan.

Pada inspeksi desktop sekitar 1272 × 716, kartu jurnal baru mulai muncul dekat bagian bawah viewport. Pada mobile 390 × 844, layar pertama dipenuhi header, panel navigasi, banner AI, statistik, filter, dan bottom bar; kartu jurnal belum terlihat. Pengguna datang untuk melihat atau menyimpan kuliner, tetapi harus melewati banyak kontrol terlebih dahulu.

## Yang perlu dipertahankan

Nama Jurnal Rasa dan konteks kuliner sudah kuat. Palet kertas hangat, tinta gelap, aksen tomat, dan satu stiker notebook memberi karakter. Simpan dari Sosmed dan Catat Cepat punya tujuan berbeda yang berguna. Peta Rasa dan Taste Finder memberi manfaat lanjutan pada koleksi.

Penyederhanaan sebaiknya mengurangi pengulangan dan dekorasi, sambil mempertahankan identitas notebook, nama fitur, dan stiker `★ JURNAL RASA EDITION` dengan ruang yang cukup.

## Temuan dan rekomendasi

| ID | Prioritas | Bukti / masalah | Mengapa mengganggu | Rekomendasi |
|---|---|---|---|---|
| UX-01 | P1 | [Navbar:120](C:/Users/rahad/Downloads/JurnalRasa/src/components/Navbar.tsx:120) dan [JournalView:140](C:/Users/rahad/Downloads/JurnalRasa/src/components/JournalView.tsx:140) menampilkan CTA sosial bersamaan | Dua tombol identik tampak sama penting | Satu tempat CTA utama per viewport. Untuk jurnal, taruh di header konten; navbar cukup brand, navigasi, akun |
| UX-02 | P1 | [JournalView:162](C:/Users/rahad/Downloads/JurnalRasa/src/components/JournalView.tsx:162), [512](C:/Users/rahad/Downloads/JurnalRasa/src/components/JournalView.tsx:512), navbar/bottom nav mengulang peta dan komunitas | Pengguna harus memindai kontrol yang melakukan hal sama | Pertahankan satu navigasi global responsif; hilangkan panel navigasi besar dan blok promosi di bawah feed |
| UX-03 | P1 | [JournalView:239](C:/Users/rahad/Downloads/JurnalRasa/src/components/JournalView.tsx:239): banner AI tepat setelah tab AI | Satu fitur punya dua ajakan berdekatan | Tab “Taste Finder” yang jelas; prompt bantuan cukup di empty state atau di dalam chat |
| UX-04 | P1 | [JournalView:260](C:/Users/rahad/Downloads/JurnalRasa/src/components/JournalView.tsx:260): statistik tiga kartu, lalu panel filter | Kontrol menggeser isi jurnal jauh ke bawah | Jadikan filter status satu baris: Semua · Ingin Dicoba · Sudah Dicoba, dengan jumlah kecil |
| UX-05 | P1 | Banyak border 2–3px, offset shadow, warna, font-black di hampir setiap elemen | Hierarki visual mendatar; semua terlihat seperti tombol utama | Border tinta pada struktur utama; kurangi shadow nested badge; surface netral pada kontrol pasif |
| UX-06 | P1 | [JournalView:361](C:/Users/rahad/Downloads/JurnalRasa/src/components/JournalView.tsx:361), [458](C:/Users/rahad/Downloads/JurnalRasa/src/components/JournalView.tsx:458): status, delete, dua aksi peta, Maps, source, rating, menu | Kartu memerlukan terlalu banyak keputusan | Utamakan nama, lokasi singkat, catatan, status; detail menu/tag/link di detail tempat. Hapus duplikasi aksi Peta Rasa |
| UX-07 | P1 | [Navbar:132](C:/Users/rahad/Downloads/JurnalRasa/src/components/Navbar.tsx:132): semua user termasuk anonymous mendapat logout; sign-in hanya untuk user null | Setelah auto-anonymous, jalur masuk Google di header menghilang | Guest menampilkan “Masuk dengan Google”/“Simpan ke akun”; auth-loading dibedakan dari signed-out |
| UX-08 | P1 | [JournalView:157](C:/Users/rahad/Downloads/JurnalRasa/src/components/JournalView.tsx:157): label Catat Cepat hilang di mobile; navbar sign-in jadi ikon saja | Fitur penting tidak mudah ditemukan atau dijelaskan | Pertahankan label Catat Cepat dan login yang dapat dibaca; ikon saja untuk aksi familiar dengan accessible name |
| UX-09 | P1 | [App.tsx:330](C:/Users/rahad/Downloads/JurnalRasa/src/App.tsx:330): toast sukses sebelum Firestore ack; chat “Online” selalu ditampilkan | Kepercayaan pengguna lebih buruk ketika data/AI gagal | Status faktual: Menyimpan, Tersimpan, Gagal—coba lagi; AI tersedia hanya setelah check atau request berhasil |
| UX-10 | P1 | [JournalView:262](C:/Users/rahad/Downloads/JurnalRasa/src/components/JournalView.tsx:262): filter statistik memakai div onClick | Tidak memiliki perilaku keyboard/native button | Gunakan button, focus-visible, aria-pressed; tab memiliki state terpilih yang dapat dikenali |
| UX-11 | P1 | [CuratorModal](C:/Users/rahad/Downloads/JurnalRasa/src/components/CuratorModal.tsx), [QuickManualModal:204](C:/Users/rahad/Downloads/JurnalRasa/src/components/QuickManualModal.tsx:204): tidak ditemukan role dialog/aria-modal/focus trap/Escape handling | Pengguna keyboard dan pembaca layar sulit berorientasi | Dialog semantics, judul terhubung, fokus awal, trap, Escape, return-focus; label terhubung ke input |
| UX-12 | P1 | CTA putih di #FF5533 | Rasio hitung sRGB sekitar 3.18:1, di bawah 4.5:1 untuk teks ukuran normal; font-bold tidak otomatis membuatnya large text | Pakai teks tinta di tomat atau varian tomat lebih gelap untuk tombol; verifikasi kombinasi aktual |
| UX-13 | P2 | [index.html:2](C:/Users/rahad/Downloads/JurnalRasa/index.html:2), filter All Cities/All Categories, label Finder yang bervariasi | Bahasa dan penamaan tidak konsisten | Shell utama Bahasa Indonesia, lang=id; label tab tetap Taste Finder. Respons Taste Finder tetap English default sesuai aturan proyek dan adaptif ke Bahasa Indonesia |
| UX-14 | P1 | [JournalView:545](C:/Users/rahad/Downloads/JurnalRasa/src/components/JournalView.tsx:545): empty state sama untuk belum punya data dan hasil filter kosong | Ajakan tambah tempat tidak membantu saat filter terlalu ketat | Bedakan jurnal baru, pencarian kosong + reset filter, gagal memuat + retry, dan mode demo |
| UX-15 | P2 | [CopilotChat:137](C:/Users/rahad/Downloads/JurnalRasa/src/components/CopilotChat.tsx:137): tinggi 640px dan padding bawah mobile | Berpotensi menyulitkan input saat keyboard virtual terbuka | Gunakan tinggi viewport dinamis, area scroll pesan, composer tetap terlihat; uji perangkat sungguhan |
| UX-16 | P1 | [App.tsx:948](C:/Users/rahad/Downloads/JurnalRasa/src/App.tsx:948), [FoodMap:130](C:/Users/rahad/Downloads/JurnalRasa/src/components/FoodMap.tsx:130): path database dan instruksi key tampil pada flow pengguna | Detail developer menambah beban dan klaim isolasi belum benar | Tampilkan manfaat dan langkah pemulihan; detail infra ke docs/log admin |

Rasio kontras di atas dihitung dari warna source, bukan pemindaian seluruh state. Standar minimum teks normal adalah 4.5:1; untuk teks besar 3:1. [W3C Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)

Persyaratan dialog merujuk perilaku fokus dan keyboard, bukan sekadar menambahkan atribut ARIA. [W3C Modal Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)

## Susunan halaman yang disarankan

### Desktop: jurnal sebagai fokus

```text
Jurnal Rasa       Jurnal Rasa | Peta Rasa | Jelajah Rasa       Akun

Catatan kulinermu                 Simpan dari Sosmed   Catat Cepat
Koleksi Tempat | Taste Finder

Cari catatan...                  Filter
Semua (12)   Ingin Dicoba (8)   Sudah Dicoba (4)

Nama tempat                 Nama tempat
Area · Kota                 Area · Kota
Cuplikan catatan pribadi     Cuplikan catatan pribadi
Status             Detail   Status             Detail
```

Judul contoh adalah copy konten, bukan pengganti nama aplikasi. Jumlah adalah ilustrasi, bukan data audit.

### Mobile: satu urutan tindakan yang jelas

```text
Jurnal Rasa                         Akun

Catatan kulinermu
[Simpan dari Sosmed] [Catat Cepat]

Koleksi Tempat | Taste Finder
[Cari catatan...]        [Filter]
Semua · Ingin Dicoba · Sudah Dicoba

Kartu catatan pertama
Kartu catatan berikutnya

Jurnal Rasa | Peta Rasa | Jelajah Rasa
```

Target: setidaknya judul dan sebagian isi kartu pertama terlihat pada viewport 390 × 844 tanpa scroll saat ada data. Catatan tampil tepat setelah search/filter; tidak ada banner promosi AI atau navigasi besar di antaranya. Empty state menggantikan daftar, bukan menambah panel lagi di atasnya.

## Aturan visual yang lebih tenang

| Elemen | Arah perbaikan |
|---|---|
| Background | Satu paper tone dominan; tekstur sangat halus bila perlu |
| Aksen | Tomat untuk satu tindakan utama; warna status dipakai secara konsisten |
| Warna pastel lain | Tetap tersedia, tetapi tidak semuanya menjadi panel besar pada satu layar |
| Border | Pertahankan 2px tinta pada kartu/struktur utama; hindari border berlapis pada setiap teks, chip, dan ikon |
| Shadow | Pertahankan hard shadow pada CTA/kartu terpilih; kontrol pasif lebih tenang |
| Tipografi | Dua keluarga font utama; handwriting sebagai aksen catatan; monospace dibatasi pada metadata yang perlu |
| Ukuran | Target body 14–16px, metadata 12–13px; hindari informasi penting 9–10px |
| Ruang | Skala 8/12/16/24/32px; jarak antarbagian lebih besar daripada jarak dalam satu kelompok |
| Stiker edisi | Satu stiker sesuai posisi proyek, tidak bertabrakan dengan CTA |
| Animasi | Hentikan ping dekoratif untuk status yang tidak live; dukung prefers-reduced-motion |

Ukuran tersebut merupakan target desain internal, bukan klaim semua ukuran kecil otomatis melanggar WCAG. Gunakan target sentuh 44 × 44px untuk aksi utama mobile; audit hit area aktual dan jarak antartarget.

## Alur Taste Finder yang relevan bagi challenge

1. Masuk dan buka Taste Finder dari tab yang konsisten.
2. Lihat scope singkat, misalnya “Menggunakan 12 tempat dari jurnalmu”.
3. Kirim pesan dan lanjutkan percakapan yang merujuk giliran sebelumnya.
4. Tampilkan penyimpanan percakapan dan ringkasan otomatis sebagai status nyata.
5. Buka “Ringkasan percakapan” dan lanjutkan sesi setelah reload.
6. Jelaskan mana hasil AI, referensi jurnal, dan informasi yang masih perlu verifikasi.

Jangan menambahkan badge “secure” untuk mengganti bukti. Jangan menambah fitur baru hanya agar halaman terasa lengkap.

## Contoh copy yang lebih jelas

| Situasi | Copy usulan |
|---|---|
| Guest | “Masuk dengan Google untuk menyimpan dan membuka jurnalmu lagi.” |
| Empty journal | “Belum ada catatan kuliner. Simpan rekomendasi pertamamu dari sosmed.” |
| Filter kosong | “Tidak ada catatan yang cocok.” + “Reset filter” |
| Gagal sinkron | “Catatan belum tersimpan ke akun.” + “Coba lagi” |
| Geocoding perkiraan | “Lokasi belum terverifikasi. Periksa titiknya sebelum disimpan.” |
| AI gagal | “Taste Finder belum bisa menjawab. Pesanmu tetap tersedia untuk dicoba lagi.” — hanya bila pesan benar-benar dipertahankan |
| Publikasi | “Bagikan info tempat ke Jelajah Rasa” + penjelasan field publik, default nonaktif |

## Cara mengukur keberhasilan redesign

Lakukan tes eksploratif dengan 5 orang yang belum melihat aplikasi; bukan survei statistik. Tanpa arahan, minta mereka:

1. Menjelaskan tujuan halaman dalam 5 detik.
2. Menyimpan link dan menemukan Catat Cepat.
3. Menemukan tempat tersimpan dan membuka peta.
4. Memulai Taste Finder dan menemukan ringkasan yang tersimpan.
5. Menjelaskan apakah mereka guest/login dan apakah catatan privat/publik.
6. Mengatasi pencarian kosong dan satu kegagalan simpan.

Target internal: minimal 4/5 peserta menyelesaikan tugas inti tanpa petunjuk, tidak ada salah tafsir kritis mengenai status simpan/privasi, dan tidak ada kendala keyboard pada alur inti. Catat waktu, salah klik, bantuan, dan komentar; jangan mengklaim angka perbaikan sebelum pengujian.

Prioritas visual pertama: hapus duplikasi navigasi dan banner AI, ringkas statistik menjadi filter, munculkan catatan lebih awal. Mengganti palet saja tidak menyelesaikan struktur halaman.

