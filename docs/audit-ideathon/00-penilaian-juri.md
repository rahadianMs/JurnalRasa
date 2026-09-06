# Penilaian Juri — Jurnal Rasa

Tanggal audit: 6 September 2026  
Baseline kode: commit `22c26a5`  
Challenge: Build a Secure “Personal Gemini Journal”  
Status: **belum layak dinyatakan memenuhi seluruh persyaratan; ide produk sudah relevan.**

## Kesimpulan juri

Jurnal Rasa punya pembeda yang jelas: mengubah rekomendasi kuliner dari media sosial menjadi catatan tempat, kemudian membantu pengguna memilih lewat Taste Finder. Tema kuliner diperbolehkan oleh brief; tidak perlu mengganti produk menjadi buku harian generik.

Kesenjangan terbesar ada pada keamanan dan persistensi percakapan. Aturan Firestore dalam repositori membuka akses catatan privat bagi request tanpa autentikasi. API backend belum memverifikasi identitas pengguna. Riwayat Taste Finder hanya hidup di state React dan belum diringkas lalu disimpan otomatis. Bukti konfigurasi Secret Manager dan Custom Instructions AI Studio belum tersedia untuk diperiksa.

Saya setuju UI terlalu ramai. Masalahnya terutama hierarki: navigasi, promosi AI, statistik, filter, dan tombol berulang mengambil perhatian lebih besar daripada isi jurnal. Identitas notebook tetap dapat dipertahankan.

## Skor simulasi: 31/100

**Ini rubrik buatan auditor, bukan bobot resmi panitia, prediksi kemenangan, atau sertifikasi keamanan.** Skor memberi kredit atas implementasi yang terlihat, tetapi tidak menganggap konfigurasi cloud atau demo berhasil tanpa bukti. Nilai rendah terutama mencerminkan ketidaksiapan terhadap tema keamanan challenge.

| Dimensi | Bobot | Skor | Pertimbangan |
|---|---:|---:|---|
| Phase 1 — security constitution & bukti AI Studio | 15 | 2 | GEMINI.md ada, tetapi dominan brand/persona; konfigurasi studio dan threat model sebelum build belum terbukti |
| Firebase authentication | 10 | 4 | SDK dan Google popup ada; guest sintetis, akses login guest, dan token backend bermasalah |
| Multi-turn Gemini & ringkasan percakapan | 15 | 7 | History dikirim ke Gemini; ringkasan otomatis dan riwayat persisten belum ada |
| Isolasi data Firestore | 20 | 2 | Path per UID ada, tetapi aturan tanpa auth justru mengizinkan akses |
| Secret management | 15 | 3 | Gemini dipanggil server-side melalui env; Secret Manager belum terbukti; key Maps backend dikirim ke browser |
| Enhancement orisinal | 10 | 7 | Parser sosial, peta, dan rekomendasi jurnal punya nilai; provenance AI Studio dan keandalan live perlu bukti |
| UI/UX & aksesibilitas | 10 | 4 | Identitas khas; kepadatan tinggi, status kurang jujur, akses keyboard bermasalah |
| Kesiapan operasi & pengujian | 5 | 2 | Typecheck/build lolos; uji isolasi, dependency audit, dan deployment belum tervalidasi |
| **Total** | **100** | **31** | **Perbaiki syarat inti sebelum mengejar fitur tambahan** |

## Pemetaan persyaratan

| Persyaratan brief | Status audit | Bukti yang tersedia | Yang diperlukan |
|---|---|---|---|
| Custom Instructions berisi threat modeling, coding, isolasi, secrets | Sebagian; pemasangan belum terbukti | [GEMINI.md](C:/Users/rahad/Downloads/JurnalRasa/GEMINI.md:1) | Security constitution lengkap + tangkapan konfigurasi AI Studio + rekam proses |
| Sign-in Firebase | Sebagian | [App.tsx](C:/Users/rahad/Downloads/JurnalRasa/src/App.tsx:88), [firebase.ts](C:/Users/rahad/Downloads/JurnalRasa/src/lib/firebase.ts:35) | Google sign-in mudah ditemukan, sesi valid, API memverifikasi token |
| Percakapan multi-turn Gemini nyata | Terimplementasi di kode; live belum diuji | [CopilotChat.tsx](C:/Users/rahad/Downloads/JurnalRasa/src/components/CopilotChat.tsx:70), [server.ts](C:/Users/rahad/Downloads/JurnalRasa/server.ts:1345) | Demo konteks lintas giliran dan error handling |
| Summaries/logs tersimpan otomatis | Belum terpenuhi dalam kode | `messages` memakai useState; handler hanya mengembalikan reply | Persist messages + summary di Firestore, reload dan login ulang berhasil |
| Zero cross-user leakage | Gagal pada aturan repositori | [firestore.rules](C:/Users/rahad/Downloads/JurnalRasa/firestore.rules:6) | Default-deny, owner checks, uji A/B/tanpa login, bersihkan state saat pergantian UID |
| Keys dari Google Cloud Secret Manager | Belum terbukti | `process.env` di server | Bukti secret binding/SDK, service account dan IAM minimum |
| Enhancement dibuat memakai AI Studio | Fitur ada; proses belum terbukti | Parser multi-tempat, Taste Finder, Peta Rasa | Rekam prompt, perubahan, hasil, serta demo berhasil |

Ringkasan suasana restoran (`vibesOrSummary`) bukan pengganti ringkasan percakapan pengguna. Keduanya punya objek dan tujuan berbeda.

## Prioritas keputusan

1. **Tutup kebocoran dan batas autentikasi:** Firestore rules, token API, key backend, pergantian akun.
2. **Lengkapi alur inti:** masuk → bercakap → ringkasan otomatis → tersimpan → dibuka lagi.
3. **Buktikan Phase 1 dan infrastruktur:** konfigurasi studio, Secret Manager, rules yang benar-benar terpasang.
4. **Sederhanakan halaman:** satu CTA utama per konteks, satu navigasi global, isi jurnal tampil lebih awal.
5. **Poles satu cerita enhancement:** “tautan kuliner → koleksi privat → rencana makan personal”.

## Cara membaca paket audit

- [01 — Audit keamanan dan arsitektur](C:/Users/rahad/Downloads/JurnalRasa/docs/audit-ideathon/01-audit-keamanan.md): temuan, risiko, perbaikan, dan batas verifikasi.
- [02 — Audit UI/UX dan arah penyederhanaan](C:/Users/rahad/Downloads/JurnalRasa/docs/audit-ideathon/02-audit-ui-ux.md): kritik konkret, susunan layar, dan target evaluasi.
- [03 — Draft Custom Instructions AI Studio](C:/Users/rahad/Downloads/JurnalRasa/docs/audit-ideathon/03-custom-instructions-ai-studio.md): instruksi yang diusulkan untuk Phase 1; belum dipasang.
- [04 — Roadmap dan acceptance criteria](C:/Users/rahad/Downloads/JurnalRasa/docs/audit-ideathon/04-roadmap-perbaikan.md): urutan implementasi dan syarat selesai.
- [05 — Bukti, pengujian, dan demo submission](C:/Users/rahad/Downloads/JurnalRasa/docs/audit-ideathon/05-bukti-dan-demo.md): hasil audit aktual dan checklist pembuktian.

## Batas penilaian

Audit membaca source, rules, konfigurasi yang tersedia, hasil typecheck/build, serta render statis komponen asli pada desktop dan mobile. Render tidak menjalankan effect React atau koneksi Firebase, sehingga tidak menguji login, tombol, jaringan, ataupun data live. Tidak dilakukan akses data pengguna lain, perubahan cloud, atau percobaan serangan terhadap deployment.

Rules yang sedang terpasang, IAM, restriction key, versi model yang tersedia untuk proyek, dan histori AI Studio belum diperiksa. Temuan tentang perilaku deployment berlaku **jika konfigurasi deployment memakai kode/rules ini**. Bukti cloud dapat mengubah skor untuk aspek yang saat ini belum terverifikasi, tetapi tidak menghapus cacat source yang sudah terlihat.

Referensi interpretasi: briefing dari pengguna adalah dasar penilaian. [Codelab Google terkait](https://codelabs.developers.google.com/codelabs/cloud-run/cloud-run-ai-challenge?hl=en) menguatkan empat kebutuhan inti dan konfigurasi keamanan di AI Studio. Ketentuan tambahan di codelab bukan otomatis kewajiban submission tanpa verifikasi briefing panitia.

