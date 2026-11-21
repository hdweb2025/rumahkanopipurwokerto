# Panduan Menambahkan Video ke Purwokerto Kanopi

Etalase video pada website ini sudah siap menampilkan video-video yang akan Anda generate menyusul.

## Cara Menambahkan Video Baru
1. Simpan file video (`.mp4` atau `.webm`) ke dalam folder `assets/videos/`, misalnya:
   `assets/videos/carport-minimalis-01.mp4`
2. Buka file `data/videos.js`.
3. Isi bagian `src` pada item yang diinginkan (atau tambahkan objek video baru):
   ```js
   {
     id: 'vid-carport-modern',
     title: 'Simulasi Carport Kaca Tempered — Purwokerto Utara',
     category: 'Carport',
     location: 'Purwokerto Utara',
     duration: '0:45',
     aspect: 'landscape',
     poster: 'assets/img/hero-kanopi-purwokerto.jpg',
     src: 'assets/videos/carport-minimalis-01.mp4',
     description: 'Visualisasi kanopi baja hitam dengan kaca smoked tempered.'
   }
   ```
4. Untuk mengaktifkan tombol kirim WhatsApp langsung pada ringkasan konsultasi, isi `whatsappNumber` di `data/site-config.js` (format `'62812xxxxxxxx'`).
