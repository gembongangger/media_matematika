# MediaMatematika - Media Pembelajaran Aljabar Interaktif

Aplikasi web interaktif untuk pembelajaran aljabar menggunakan SvelteKit. Aplikasi ini menyediakan dua konsep utama:

## Fitur Utama

### 1. ⚖️ Neraca Keseimbangan (Balance Scale)
Visualisasi konsep persamaan aljabar menggunakan neraca/timbangan:
- **Konsep**: Memahami bahwa persamaan harus seimbang
- **Interaktif**: Tambah/kurangi nilai di ruas kiri dan kanan
- **Animasi**: Timbangan bergerak sesuai selisih nilai
- **Visual**: Indikator keseimbangan dengan progress bar

**Cara Menggunakan:**
1. Masukkan nilai a, b, c untuk persamaan `ax + b = c`
2. Klik "Selesaikan" untuk melihat solusi
3. Klik "Terapkan ke Neraca" untuk memvisualisasikan
4. Gunakan tombol +1, +0.5, -0.5, -1 untuk menyesuaikan neraca
5. Buat neraca seimbang dengan menyamakan nilai kedua ruas

### 2. 🔄 Pindah Ruas (Transposition)
Simulasi drag-and-drop untuk memindahkan angka antar ruas:
- **Drag & Drop**: Seret angka dari satu ruas ke ruas lain
- **Otomatis**: Tanda berubah saat pindah ruas (+5 menjadi −5)
- **Real-time**: Persamaan dan solusi update otomatis
- **Undo**: Bisa membatalkan langkah sebelumnya

**Cara Menggunakan:**
1. Lihat persamaan awal (contoh: `2x + 5 = 15`)
2. Seret angka `+5` dari ruas kiri ke ruas kanan
3. Perhatikan perubahan tanda menjadi `-5`
4. Lanjutkan sampai menemukan nilai `x`
5. Gunakan Undo jika perlu membatalkan

## Teknologi

- **SvelteKit 2.x** - Framework web yang cepat dan reaktif
- **Svelte 5** - Dengan runes system ($state, $derived, $effect)
- **TypeScript** - Type safety untuk kode yang lebih baik
- **CSS Gradients** - Visual yang menarik dan modern
- **Spring Animations** - Animasi halus dari svelte/motion

## Instalasi

```bash
# Install dependencies
npm install

# Jalankan development server
npm run dev

# Build untuk production
npm run build

# Preview production build
npm run preview
```

## Struktur Proyek

```
media_matematika/
├── src/
│   ├── lib/
│   │   └── components/
│   │       ├── BalanceScale.svelte    # Komponen neraca keseimbangan
│   │       └── Transposition.svelte   # Komponen pindah ruas
│   ├── routes/
│   │   ├── +layout.svelte             # Layout utama
│   │   └── +page.svelte               # Halaman utama
│   ├── app.css                        # Global styles
│   └── app.html                       # HTML template
├── static/                            # Static assets
├── package.json
├── svelte.config.js
└── vite.config.js
```

## Konsep Pembelajaran

### Neraca Keseimbangan
Mengajarkan bahwa:
- Persamaan seperti timbangan yang harus seimbang
- Apa yang dilakukan di satu ruas, harus dilakukan juga di ruas lain
- Keseimbangan tercapai saat nilai kiri = nilai kanan

### Pindah Ruas (Transposisi)
Mengajarkan bahwa:
- Memindahkan angka melintasi `=` mengubah tandanya
- `+5` pindah ruas menjadi `-5`
- `-3` pindah ruas menjadi `+3`
- Tujuan: mengisolasi variabel di satu sisi

## Pengembangan

Aplikasi ini dibuat dengan filosofi:
1. **Interaktif**: Siswa belajar dengan melakukan, bukan hanya membaca
2. **Visual**: Konsep abstrak dibuat konkret dengan visualisasi
3. **Reaktif**: Perubahan langsung terlihat real-time
4. **Intuitif**: UI/UX yang mudah dipahami tanpa penjelasan berlebihan

## Lisensi

MIT License - Bebas digunakan untuk tujuan pendidikan
