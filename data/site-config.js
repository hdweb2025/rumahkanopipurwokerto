/**
 * Konfigurasi Utama Brand & Konten — Purwokerto Kanopi
 * Ubah kontak WhatsApp, pilihan model, dan area layanan di sini.
 */
window.PK_CONFIG = {
  brandName: 'Purwokerto Kanopi',
  domain: 'rumahkanopipurwokerto.com',
  city: 'Purwokerto & Banyumas',

  canopyModels: [
    {
      id: 'tempered-glass',
      name: 'Kaca Tempered & Baja Hitam',
      badge: 'Modern Minimalis',
      roofMaterial: 'Kaca Tempered 10mm / Laminated',
      frameMaterial: 'Besi Hollow Galvanis 5x10 Matte Black',
      highlight: 'Tampilan bersih, cahaya alami masuk, cocok untuk fasad rumah modern.',
      weatherNote: 'Ideal untuk area perkotaan Purwokerto dengan kemiringan talang tersembunyi.',
      image: 'assets/img/hero-kanopi-purwokerto.jpg',
      accentTag: 'Cahaya Alami'
    },
    {
      id: 'pergola-wpc',
      name: 'Pergola Kisi WPC & Baja',
      badge: 'Tropical Resort',
      roofMaterial: 'Kaca / Solarflat + Plafon Kisi WPC',
      frameMaterial: 'WF / Hollow Structural Charcoal',
      highlight: 'Nuansa kayu hangat di bagian bawah tanpa lapuk, sangat elegan untuk teras & taman.',
      weatherNote: 'Tahan lembap tinggi khas kawasan Banyumas dan Baturraden.',
      image: 'assets/img/halaman-rumah-pergola.jpg',
      accentTag: 'Aksen Kayu'
    },
    {
      id: 'alderon-twinwall',
      name: 'Alderon Twinwall Peredam',
      badge: 'Teduh & Senyap',
      roofMaterial: 'uPVC Alderon Twinwall 10mm',
      frameMaterial: 'Hollow Galvanis Anti-Karat Double Coat',
      highlight: 'Meredam panas matahari dan suara hujan deras secara signifikan.',
      weatherNote: 'Paling populer untuk hujan lebat Purwokerto; menjaga carport tetap sejuk.',
      image: 'assets/img/detail-kanopi-dusk.jpg',
      accentTag: 'Peredam Hujan'
    },
    {
      id: 'solarflat-solid',
      name: 'Solarflat Polycarbonate Solid',
      badge: 'Elegan Tahan Bentur',
      roofMaterial: 'Solarflat 3mm Clear / Bronze / Grey',
      frameMaterial: 'Hollow Galvanis / Baja Ringan Premium',
      highlight: 'Bening seperti kaca namun jauh lebih ringan dan tahan benturan.',
      weatherNote: 'Dilengkapi lapisan anti-UV untuk terik siang hari di dataran rendah.',
      image: 'assets/img/hero-kanopi-purwokerto.jpg',
      accentTag: 'Anti-UV'
    },
    {
      id: 'cantilever-luxury',
      name: 'Cantilever Tanpa Tiang Depan',
      badge: 'Bespoke Arsitektural',
      roofMaterial: 'Smoked Glass / Alderon + Fascia Box',
      frameMaterial: 'Baja WF / Struktur Kantilever',
      highlight: 'Akses parkir mobil lega tanpa halangan tiang di bagian depan halaman.',
      weatherNote: 'Membutuhkan survei struktur dinding dan angkur pondasi di lokasi.',
      image: 'assets/img/hero-kanopi-purwokerto.jpg',
      accentTag: 'Bebas Tiang'
    },
    {
      id: 'led-fascia',
      name: 'Signature Fascia + LED Ambient',
      badge: 'Dusk Edition',
      roofMaterial: 'Kombinasi Atap + Plafon + Strip LED IP65',
      frameMaterial: 'Hollow + Lisplank ACP / Steel Box',
      highlight: 'Pencahayaan hangat tersembunyi di sekeliling bingkai untuk tampilan malam yang berkelas.',
      weatherNote: 'Instalasi kabel tertanam aman anti-air hujan (IP65).',
      image: 'assets/img/detail-kanopi-dusk.jpg',
      accentTag: 'Warm LED'
    }
  ],

  locations: [
    {
      id: 'purwokerto-utara',
      name: 'Purwokerto Utara',
      areas: 'Grendeng, Karangwangkal, Bancarkembar, Pabuwaran, Sumampir',
      surveyWindow: 'Survei tersedia setiap hari (08.30 – 17.00 WIB)',
      windNote: 'Kawasan hunian & kampus dengan banyak perumahan minimalis; cocok model kaca/pergola.'
    },
    {
      id: 'purwokerto-timur',
      name: 'Purwokerto Timur',
      areas: 'Arcawinangun, Mersi, Purwokerto Lor, Purwokerto Wetan, Kranji',
      surveyWindow: 'Survei cepat area pusat kota & kompleks perumahan',
      windNote: 'Area padat perkotaan; peredam panas Alderon & talang tanam sangat disarankan.'
    },
    {
      id: 'purwokerto-selatan',
      name: 'Purwokerto Selatan',
      areas: 'Karangklesem, Teluk, Berkoh, Tanjung, Purwokerto Kidul',
      surveyWindow: 'Survei terjadwal harian, akses mudah ke jalur utama',
      windNote: 'Banyak halaman carport luas; model Cantilever atau Solarflat sangat diminati.'
    },
    {
      id: 'purwokerto-barat',
      name: 'Purwokerto Barat',
      areas: 'Pasir Muncang, Rejasari, Bantarsoka, Karanglewas Lor, Kedungwuluh',
      surveyWindow: 'Survei tersedia pagi hingga sore hari',
      windNote: 'Cocok kombinasi rangka galvanis anti-karat untuk ketahanan jangka panjang.'
    },
    {
      id: 'baturraden',
      name: 'Baturraden & Lereng Slamet',
      areas: 'Rempoah, Kemutug, Pamijen, Pandak, Kebumen',
      surveyWindow: 'Survei khusus dengan pengecekan struktur angin & curah hujan',
      windNote: 'Curah hujan tinggi & angin gunung: wajib rangka tebal dan kemiringan air optimal.'
    },
    {
      id: 'sokaraja-kembaran',
      name: 'Sokaraja, Kembaran & Sekitarnya',
      areas: 'Sokaraja, Dukuhwaluh, Bojongsari, Patikraja, Kalibagor',
      surveyWindow: 'Jangkauan penuh area penyangga Purwokerto',
      windNote: 'Bebas biaya konsultasi awal berdasarkan foto halaman rumah & titik peta.'
    }
  ],

  yardReferences: [
    {
      title: 'Carport Minimalis Kaca Smoked',
      area: 'Purwokerto Utara • Halaman 5 x 6 m',
      model: 'Kaca Tempered & Baja Hitam',
      image: 'assets/img/hero-kanopi-purwokerto.jpg',
      note: 'Halaman terbuka dengan dua jalur mobil tanpa kolom tengah.'
    },
    {
      title: 'Teras Samping & Plafon WPC',
      area: 'Baturraden • Teras 4 x 7 m',
      model: 'Pergola Kisi WPC & Baja',
      image: 'assets/img/halaman-rumah-pergola.jpg',
      note: 'Menyatu dengan batu alam dan taman tropis halaman rumah.'
    },
    {
      title: 'Fasad Malam dengan Lisplank LED',
      area: 'Purwokerto Timur • Patio 3.5 x 6 m',
      model: 'Signature Fascia + LED Ambient',
      image: 'assets/img/detail-kanopi-dusk.jpg',
      note: 'Pencahayaan hangat IP65 tertanam rapi di rangka baja.'
    }
  ],

  interactiveQuestions: [
    {
      id: 'area',
      stepLabel: 'Area Halaman',
      question: 'Bagian rumah mana yang ingin dipasangi kanopi?',
      type: 'single',
      options: [
        { value: 'Carport / Garasi Depan', desc: 'Melindungi kendaraan & akses masuk rumah' },
        { value: 'Teras Depan / Fasad', desc: 'Area duduk santai sekaligus mempercantik tampilan' },
        { value: 'Taman / Patio Belakang', desc: 'Ruang kumpul keluarga semi-outdoor' },
        { value: 'Balkon / Lantai Atas', desc: 'Penambahan atap pelindung lantai 2' }
      ]
    },
    {
      id: 'priority',
      stepLabel: 'Prioritas Utama',
      question: 'Apa hal terpenting bagi Anda untuk kanopi di rumah ini?',
      type: 'single',
      options: [
        { value: 'Tampilan Mewah & Cahaya Alami', desc: 'Kaca tempered / solarflat bening atau smoked' },
        { value: 'Sejuk & Senyap Saat Hujan Deras', desc: 'Alderon twinwall atau kombinasi plafon peredam' },
        { value: 'Hangat Bernuansa Kayu Tropis', desc: 'Pergola kisi WPC dengan rangka baja gelap' },
        { value: 'Lega Tanpa Tiang Depan', desc: 'Desain kantilever agar parkir lebih leluasa' }
      ]
    },
    {
      id: 'condition',
      stepLabel: 'Kondisi Lahan',
      question: 'Bagaimana kondisi halaman rumah saat ini?',
      type: 'single',
      options: [
        { value: 'Sudah Cor / Paving Rapi', desc: 'Siap pasang tapak tiang atau angkur dinding' },
        { value: 'Masih Tanah / Rumput', desc: 'Perlu titik umpak pondasi tiang' },
        { value: 'Ganti Kanopi Lama', desc: 'Perlu pembongkaran struktur kanopi sebelumnya' },
        { value: 'Rumah Baru / Sedang Renovasi', desc: 'Koordinasi tinggi rangka dan talang air' }
      ]
    },
    {
      id: 'timeline',
      stepLabel: 'Jadwal & Video',
      question: 'Kapan perkiraan rencana survei atau pemasangan?',
      type: 'single',
      options: [
        { value: 'Segera (Minggu Ini)', desc: 'Prioritas survei lokasi & kirim foto halaman' },
        { value: 'Dalam 2–4 Minggu', desc: 'Masih membandingkan model & video referensi' },
        { value: '1–3 Bulan Lagi', desc: 'Tahap perencanaan / menunggu renovasi selesai' },
        { value: 'Sekadar Konsultasi & Estimasi', desc: 'Cek kecocokan model untuk halaman rumah' }
      ]
    }
  ],

  faqs: [
    {
      q: 'Kenapa perlu upload foto halaman rumah terlebih dahulu?',
      a: 'Dengan foto halaman rumah, tim dapat langsung menilai lebar bentangan, posisi dinding tumpuan, arah tampias hujan, dan memberi rekomendasi model kanopi paling pas sebelum survei fisik.'
    },
    {
      q: 'Model kanopi apa yang paling awet untuk hujan deras di Purwokerto?',
      a: 'Untuk peredam suara hujan dan panas terbaik, Alderon Twinwall atau sistem rangka dengan plafon WPC sangat ideal. Untuk kesan modern terang, Kaca Laminated/Tempered dengan talang air tersembunyi adalah pilihan terbaik.'
    },
    {
      q: 'Apakah video proyek asli Purwokerto Kanopi bisa ditonton di sini?',
      a: 'Ya, bagian Galeri Video sudah disiapkan khusus sebagai etalase video hasil render desain dan dokumentasi proyek nyata yang akan segera diperbarui secara berkala.'
    },
    {
      q: 'Apakah melayani luar pusat kota Purwokerto seperti Baturraden dan Sokaraja?',
      a: 'Ya, jangkauan kami mencakup seluruh kecamatan di Purwokerto serta wilayah Banyumas sekitarnya termasuk Baturraden, Sokaraja, Kembaran, Karanglewas, dan Patikraja.'
    }
  ]
};
