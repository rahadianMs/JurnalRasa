# Roadmap Perbaikan & Kriteria Selesai

Tujuan: membuat Jurnal Rasa layak dibuktikan sebagai aplikasi Gemini privat dan aman, dengan satu enhancement kuliner yang jelas. Ini rencana implementasi, bukan perubahan yang telah dikerjakan.

## Urutan pengerjaan

| Tahap | Prioritas | Pekerjaan | Bergantung pada | Syarat keluar |
|---|---|---|---|---|
| 0. Fondasi dan bukti | P0 | Pasang security constitution, threat model, sepakati kebijakan guest/publik/map, siapkan akun A/B dan environment uji | Akses proyek AI Studio/cloud | Konfigurasi terdokumentasi dan baseline tercatat |
| 1. Batas keamanan | P0 | SEC-01–05, SEC-07–08: rules privat, public writes, token API, secrets, state akun | Tahap 0 | Tes negatif owner/non-owner/unauth lulus; bukti secret runtime |
| 2. Percakapan persisten | P0 | History backend, message persistence, summary otomatis, restore, retry | Identitas dan ownership benar | Percakapan dan ringkasan bertahan setelah reload dan login ulang |
| 3. Integritas integrasi | P1 | SSRF, schema validation, quota, public opt-in, idempotent counters, data provenance | Tahap 1 | Input buruk ditolak, publikasi aman, fallback jujur |
| 4. Penyederhanaan UI | P1 | Hilangkan CTA/nav/banner berulang; ringkas filter; perbaiki guest/login dan status simpan | State Tahap 1–2 disepakati | Isi jurnal terlihat lebih awal, alur utama dapat dioperasikan keyboard/mobile |
| 5. Release dan submission | P1 | Build/runtime, uji deployment, sinkronisasi README, evidence, rekam demo | Semua sebelumnya | Bukti cocok dengan revision yang akan diserahkan |

Estimasi kasar satu developer yang mengenal repo: sekitar 5–8 hari kerja efektif untuk hardening, persistence, UI, dan pembuktian. Ini bukan komitmen waktu; akses cloud, model/API, temuan tes, dan linking guest dapat memperpanjangnya. Jangan mengurangi tes isolasi untuk memenuhi estimasi.

Jika tenggat sangat dekat, pangkas promosi/community polish dan eksperimen fitur baru. Dahulukan empat syarat inti plus satu enhancement yang sudah ada.

## Model data target yang cukup sederhana

```text
users/{uid}/saved_places/{placeId}
users/{uid}/conversations/{conversationId}
users/{uid}/conversations/{conversationId}/messages/{messageId}
public_places/{placeId}  # field publik yang telah disetujui
```

Conversation menyimpan title, createdAt, updatedAt, lastMessageVersion, summary, summaryVersion, summaryStatus dan summaryUpdatedAt. Message menyimpan role, content, createdAt dan requestId. Tentukan batas ukuran, paginasi history, serta kebijakan retensi.

Summary cukup satu field pada conversation untuk tahap awal; tidak perlu vector database, microservice baru, atau sistem memory kompleks. Jika kelak ringkasan butuh version history, tambahkan setelah use case-nya jelas.

Aturan client membolehkan owner membaca riwayatnya; untuk pola seluruh penulisan chat melalui backend, client write pada messages/summary dapat ditolak. Backend memakai Admin SDK sehingga harus menegakkan UID, ownership, schema dan batas operasi sendiri.

## Alur simpan otomatis yang diusulkan

1. Client mengirim pesan baru, conversationId dan requestId dengan Firebase ID token.
2. Server memverifikasi token, memeriksa ownership, dan memastikan requestId belum diproses.
3. Server menyimpan pesan pengguna dengan status yang jelas dan membaca konteks jurnal miliknya.
4. Server meminta Gemini menjawab menggunakan history yang valid.
5. Jawaban disimpan; status generation berhasil diperbarui.
6. Gemini menghasilkan ringkasan singkat; server menyimpannya bersama summaryVersion.
7. UI menampilkan status tersimpan atau ringkasan sedang/gagal diperbarui.
8. Reload mengambil history/summary milik UID yang sama.

Untuk MVP, proses summary dapat berada dalam satu alur server dengan deadline yang terukur; jangan mengandalkan pekerjaan fire-and-forget setelah respons HTTP. Jika dipisahkan menjadi background task, gunakan eksekusi durable dan retry yang dapat dipantau. Cegah ringkasan lama menimpa versi lebih baru.

## Acceptance criteria wajib

| ID | Kriteria | Verifikasi |
|---|---|---|
| AC-01 | Akun A hanya mengakses private data A; B dan tanpa login tidak dapat read/list/create/update/delete data A | Rules emulator termasuk query collection; lalu environment uji yang terisolasi |
| AC-02 | Endpoint Gemini/Maps menolak token kosong/palsu/kedaluwarsa sebelum upstream call | API integration test dengan upstream spy; hasil 401 |
| AC-03 | Mengganti uid/conversationId dalam request tidak memberi akses akun lain | Uji owner mismatch dan body tampering |
| AC-04 | Sign-out/pergantian akun langsung menutup data, selectedPlace, draft/chat dan respons lama | Uji jaringan lambat, listener gagal, serta respons AI terlambat |
| AC-05 | Production secret berasal dari Secret Manager dan runtime punya IAM minimum | Konfigurasi service/revision dan secret reference, tanpa value |
| AC-06 | Browser/network/static files tidak mengandung secret backend | Inspeksi response config, bundle, server artifact paths, dan log |
| AC-07 | Tiga giliran percakapan mempertahankan konteks nyata | Gemini smoke test pada akun uji; riwayat tersimpan |
| AC-08 | Ringkasan dibuat/diperbarui otomatis tanpa tombol simpan manual | Periksa summaryVersion dan isi setelah satu percakapan berhasil |
| AC-09 | Reload, tutup/buka tab aplikasi, logout-login memulihkan data akun yang benar | E2E dan inspeksi Firestore akun uji |
| AC-10 | API/model/Firestore gagal tidak menampilkan keberhasilan palsu; retry tidak menggandakan data | Failure injection, requestId yang sama, double click |
| AC-11 | Host palsu, redirect privat dan payload terlalu besar ditolak | Unit/integration test fetch mock; tidak menyerang production |
| AC-12 | Penyimpanan privat tidak memublikasikan catatan atau percakapan; publikasi tempat opt-in dan whitelist | Bandingkan dokumen privat/publik dan uji overwrite/abuse |
| AC-13 | Data fallback tidak menampilkan rating/koordinat perkiraan sebagai fakta | Matikan provider di environment uji; periksa label dan data |
| AC-14 | Mobile 390 × 844 menampilkan awal catatan; Catat Cepat dan login dapat dikenali | Screenshot komparatif; ukuran lain 360px/tablet/desktop |
| AC-15 | Semua tindakan inti bisa dijalankan keyboard; modal mengelola fokus; teks CTA memenuhi kontras | Keyboard manual, screen reader spot-check dan perhitungan warna |
| AC-16 | Build dan runtime production berhasil pada PORT yang dikonfigurasi; source server tidak tersaji | Cold start, health/readiness, GET artifact backend |
| AC-17 | Phase 1 dan enhancement mempunyai bukti proses AI Studio yang jujur | Konfigurasi, prompt, threat table, diff dan demo revision sama |

## Enhancement yang sebaiknya ditonjolkan

**Pilihan utama: Simpan dari Sosmed → Taste Finder berbasis koleksi privat.**

Contoh cerita: pengguna menyimpan dua rekomendasi kuliner, mengoreksi lokasi yang belum pasti, lalu meminta Taste Finder memilih tempat makan sesuai catatan dan menyusun rencana singkat. Percakapan beserta ringkasannya tersimpan otomatis untuk dibuka kembali.

Kekuatan: masalah nyata, konteks Indonesia, pemanfaatan Gemini yang dapat dilihat, dan hubungan alami dengan jurnal. Tidak perlu memperbanyak fitur hanya demi Phase 3. Rekam bahwa enhancement diperbaiki/dibangun di AI Studio dan tunjukkan batas parser jika platform memblokir akses.

Tambahan kecil yang masuk akal setelah inti lulus: alasan rekomendasi disertai referensi tempat tersimpan dan tanda lokasi terverifikasi. Jangan menyamakan penambahan summary dengan enhancement orisinal karena summary sudah bagian alur dasar challenge.

## Yang ditunda

Gamification, feed sosial lebih luas, badge tambahan, dashboard analitik, rekomendasi yang tidak bersumber dari jurnal, dan animasi dekoratif. Perubahan ini menambah beban desain/keamanan tanpa menutup gap utama saat ini.

## Definisi siap diajukan

Semua P0 tertutup dan diverifikasi pada revision target; tidak ada temuan kritis/tinggi yang masih terbuka dalam alur utama; syarat Phase 1–3 memiliki bukti; UI menampilkan identitas/privasi/status simpan secara akurat; demo mencakup kegagalan akses lintas akun dan pemulihan riwayat. Jika bukti belum tersedia, catat statusnya “belum terverifikasi”.

