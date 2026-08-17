# Business Requirement Document (BRD)
## Aplikasi Silsilah Keluarga Online

| | |
|---|---|
| **Versi** | 1.0 |
| **Tanggal** | 17 Agustus 2026 |
| **Status** | Draft |

---

## 1. Latar Belakang

Saat ini pembuatan silsilah keluarga umumnya dilakukan secara manual (dokumen, gambar statis, atau aplikasi yang membatasi satu orang hanya bisa punya satu peran/relasi). Kebutuhan yang muncul: satu individu bisa berperan berbeda di silsilah yang berbeda (misal: anak angkat di Silsilah Keluarga A, tetapi anak kandung di Silsilah Keluarga B karena adopsi lintas keluarga), dan data individu tersebut sebaiknya tidak perlu diinput ulang setiap kali dipakai di silsilah lain.

Referensi visual (mockup) menunjukkan pola generasi berjenjang (G1–G4: Pendiri, Anak, Menantu, Cucu, Cicit) dengan kartu foto per individu, garis pasangan, garis keturunan, ringkasan statistik anggota, dan tombol berbagi (share).

## 2. Tujuan Bisnis

- Menyediakan satu platform terpusat bagi pengguna untuk membuat dan mengelola **lebih dari satu** silsilah keluarga.
- Memungkinkan satu individu (person) muncul di beberapa silsilah dengan **peran/relasi yang berbeda-beda** tanpa duplikasi data biodata.
- Memudahkan berbagi (share) bagan silsilah ke pihak lain, baik untuk dilihat maupun diedit bersama.

## 3. Ruang Lingkup (Scope)

### 3.1 Termasuk dalam Lingkup
- Manajemen akun pengguna utama (registrasi, login).
- Pembuatan dan pengelolaan banyak silsilah (tree) per pengguna.
- Manajemen data individu (person) sebagai entitas global, lintas silsilah.
- Manajemen relasi antar individu per silsilah (anak kandung, anak angkat, menantu, pasangan, dll).
- Visualisasi bagan silsilah interaktif (zoom, pan, expand/collapse).
- Berbagi silsilah via tautan (view-only / edit) dan kolaborasi multi-user.
- Statistik ringkas silsilah (jumlah anggota, anak, cucu, cicit, jenis kelamin, status wafat).
- Ekspor bagan (gambar/PDF).

### 3.2 Di Luar Lingkup (Phase 1)
- Verifikasi silsilah berbasis dokumen resmi/legal.
- Integrasi DNA/genetic testing.
- Aplikasi mobile native (fokus awal web responsif).

## 4. Pemangku Kepentingan (Stakeholders)

| Peran | Deskripsi |
|---|---|
| Pengguna Utama (Owner) | Membuat dan memiliki satu atau lebih silsilah |
| Kolaborator | Diundang oleh Owner untuk ikut mengedit silsilah tertentu |
| Pengunjung (Viewer) | Mengakses silsilah melalui tautan share, tanpa akun |

## 5. Kebutuhan Fungsional (Functional Requirements)

### FR-1 Manajemen Akun
- FR-1.1 Pengguna dapat mendaftar dan login dengan akun utama.
- FR-1.2 Satu akun utama dapat memiliki (owned) banyak silsilah.

### FR-2 Manajemen Silsilah (Tree)
- FR-2.1 Pengguna dapat membuat silsilah baru dengan nama (mis. "Bani Fulan").
- FR-2.2 Pengguna dapat melihat daftar seluruh silsilah yang dimiliki atau diakses.
- FR-2.3 Pengguna dapat mengedit nama dan pengaturan privasi silsilah.
- FR-2.4 Pengguna dapat menghapus silsilah miliknya.

### FR-3 Manajemen Individu (Person)
- FR-3.1 Pengguna dapat menambahkan individu baru beserta biodata (nama, foto, tanggal lahir, tanggal wafat jika ada).
- FR-3.2 Saat menambahkan individu ke suatu silsilah, sistem menawarkan pencarian individu yang **sudah ada** di silsilah lain agar dapat dihubungkan (linked), bukan membuat duplikat data.
- FR-3.3 Data biodata individu (foto, nama, tanggal lahir/wafat) bersifat global dan konsisten meski individu tersebut muncul di banyak silsilah.

### FR-4 Manajemen Relasi
- FR-4.1 Pengguna dapat menetapkan tipe relasi antar individu **dalam konteks satu silsilah tertentu**: anak kandung, anak angkat, menantu, pasangan (kawin/cerai), dan lainnya.
- FR-4.2 Tipe relasi yang sama antara dua individu dapat **berbeda di silsilah lain** (mis. anak angkat di Silsilah A, anak kandung di Silsilah B) tanpa saling memengaruhi.
- FR-4.3 Sistem menghitung generasi (G1, G2, G3, dst.) secara otomatis berdasarkan struktur relasi dari individu Pendiri, bukan input manual.
- FR-4.4 Sistem melakukan validasi untuk mencegah relasi siklik (mis. seseorang menjadi leluhur dari dirinya sendiri).

### FR-5 Visualisasi Bagan
- FR-5.1 Sistem menampilkan bagan silsilah berbentuk pohon dengan kartu foto per individu, dikelompokkan per generasi.
- FR-5.2 Bagan mendukung zoom in/out, geser (pan), dan expand/collapse cabang.
- FR-5.3 Label peran (Pendiri/Anak/Menantu/Cucu/Cicit) ditampilkan otomatis sesuai relasi dalam silsilah tersebut.
- FR-5.4 Sistem menampilkan ringkasan statistik: total anggota, jumlah anak/cucu/cicit, jumlah laki-laki/perempuan, jumlah anggota wafat.

### FR-6 Berbagi (Sharing)
- FR-6.1 Pengguna dapat membuat tautan berbagi (share link) untuk suatu silsilah dengan hak akses "lihat saja" (view) atau "dapat mengedit" (edit).
- FR-6.2 Tautan berbagi dapat diberi batas waktu (expiry) atau dinonaktifkan kapan saja.
- FR-6.3 Pengguna dapat mengundang kolaborator terdaftar dengan peran akses tertentu untuk mengedit silsilah bersama-sama.

### FR-7 Ekspor
- FR-7.1 Pengguna dapat mengekspor bagan silsilah sebagai gambar atau dokumen PDF.

## 6. Kebutuhan Non-Fungsional (Non-Functional Requirements)

| Kategori | Kebutuhan |
|---|---|
| Skalabilitas | Mendukung silsilah dengan ratusan anggota dan banyak silsilah per akun tanpa penurunan performa render bagan |
| Privasi | Data individu yang masih hidup (tanggal lahir lengkap, kontak) dapat disembunyikan pada tautan share publik |
| Performa | Bagan besar tetap responsif melalui virtualisasi/pemuatan bertahap node yang tidak terlihat |
| Kompatibilitas | Aplikasi web responsif, dapat diakses dari desktop dan perangkat mobile |
| Auditabilitas | Perubahan data (tambah/edit/hapus individu atau relasi) tercatat untuk keperluan riwayat perubahan |

## 7. Model Data (Ringkasan Konseptual)

Prinsip utama: **individu (Person)** dipisahkan dari **relasi (Relationship)**. Relasi tidak melekat langsung pada Person, melainkan pada keanggotaan individu di suatu silsilah tertentu (TreeMember). Dengan pemisahan ini, satu Person dapat memiliki relasi berbeda di setiap silsilah tanpa duplikasi biodata.

Entitas utama:
- **User** — akun pengguna utama, dapat memiliki banyak Tree.
- **Person** — identitas individu secara global (biodata, foto), dapat muncul di banyak Tree.
- **Tree** — satu silsilah keluarga, dimiliki oleh satu User.
- **TreeMember** — penghubung antara Person dan Tree, menyimpan generasi individu tersebut dalam konteks Tree itu.
- **Relationship** — relasi antar dua TreeMember (bukan antar dua Person langsung), memiliki tipe relasi (anak kandung, anak angkat, menantu, pasangan, dll).
- **ShareLink** — tautan berbagi suatu Tree, dengan hak akses dan masa berlaku.

## 8. Tech Stack & Infrastruktur

### 8.1 Ringkasan Stack

| Layer | Pilihan | Keterangan |
|---|---|---|
| Frontend framework | TanStack Start (React) | Full-stack React framework berbasis TanStack Router, SSR-ready |
| Routing | TanStack Router | Type-safe routing, cocok untuk struktur halaman dashboard/tree/share |
| Data fetching & caching | TanStack Query | Sinkronisasi state server (daftar tree, person, relationship) di client |
| Tabel/list (opsional) | TanStack Table | Untuk tampilan daftar anggota dalam bentuk tabel sebagai alternatif dari bagan |
| Bagan/canvas silsilah | React Flow | Render node (person) dan edge (relationship) secara interaktif (zoom, pan, drag) |
| ORM | Drizzle ORM | Query builder type-safe ke Postgres, skema didefinisikan sebagai kode (schema-as-code) |
| Database & Auth | Supabase (Postgres) | Database terkelola, autentikasi pengguna, storage foto, realtime (opsional untuk kolaborasi) |
| Storage foto | Supabase Storage | Menyimpan foto profil individu (Person) |
| Hosting frontend | Vercel / Netlify (atau platform Node lain) | Deploy TanStack Start (SSR) |
| Validasi skema | Zod | Validasi input form dan payload API, terintegrasi dengan Drizzle |

### 8.2 Alasan Pemilihan

- **TanStack (Start, Router, Query)** dipilih agar frontend dan backend (server functions) berada dalam satu basis kode yang type-safe end-to-end, dan TanStack Query menyederhanakan sinkronisasi data bagan yang sering berubah (tambah/edit person & relationship).
- **Drizzle ORM** dipilih karena ringan, type-safe, dan skemanya bisa dipetakan langsung dari model data konseptual di Bagian 7 (User, Person, Tree, TreeMember, Relationship, ShareLink) menjadi tabel Postgres tanpa banyak abstraksi tambahan.
- **Supabase** dipilih sebagai database Postgres terkelola sekaligus penyedia autentikasi (untuk akun pengguna utama & kolaborator) dan storage (untuk foto individu), sehingga mengurangi kebutuhan infrastruktur terpisah pada tahap MVP. Fitur Row Level Security (RLS) Supabase dapat dimanfaatkan untuk membatasi akses tiap Tree sesuai kepemilikan/kolaborator.

### 8.3 Peta Model Data ke Skema Drizzle (Ringkasan)

Tabel Drizzle mengikuti entitas pada Bagian 7 secara langsung: `users`, `persons`, `trees`, `tree_members`, `relationships`, `share_links`. Autentikasi memanfaatkan skema `auth.users` bawaan Supabase, dengan tabel `users`/profil aplikasi mereferensikan `auth.users.id` sebagai foreign key.

### 8.4 Pertimbangan Infrastruktur Lain

| Aspek | Pendekatan |
|---|---|
| Realtime kolaborasi | Supabase Realtime (opsional, untuk sinkronisasi multi-editor pada satu Tree) |
| Keamanan akses data | Row Level Security (RLS) per Tree berdasarkan owner_id/kolaborator |
| Migrasi skema | Drizzle Kit untuk generate & menjalankan migrasi ke Supabase Postgres |
| Environment | Terpisah antara development, staging, dan production project di Supabase |

## 9. Asumsi

- Pengguna utama bertanggung jawab atas keakuratan data yang diinput.
- Satu individu (Person) yang sama di berbagai silsilah diasumsikan direpresentasikan sebagai satu entitas, dihubungkan secara manual oleh pengguna saat penambahan.

## 10. Batasan (Constraints)

- Fase awal (MVP) difokuskan pada platform web, belum mencakup aplikasi native.
- Validasi relasi silsilah bersifat struktural (mencegah siklus), bukan validasi biologis/legal.

## 11. Kriteria Keberhasilan (Success Criteria)

- Pengguna dapat membuat lebih dari satu silsilah dalam satu akun.
- Satu individu dapat ditautkan ke lebih dari satu silsilah dengan tipe relasi yang berbeda pada masing-masing silsilah, dan perubahan pada satu silsilah tidak memengaruhi relasi individu tersebut di silsilah lain.
- Bagan silsilah dapat dibagikan melalui tautan dan diakses sesuai hak akses yang ditentukan.

## 12. Lampiran

- Referensi mockup: struktur bagan berjenjang G1 (Pendiri) hingga G4 (Cicit), dengan kartu individu, garis pasangan, garis keturunan, panel ringkasan anggota, dan tombol berbagi.
