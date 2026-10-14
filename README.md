# Trafic-Count
Aplikasi untuk menghitung kendaraan lewat
Dua cara menghitung: dari kamera HP langsung, atau dari video rekaman di galeri. Untuk video, waktu kejadian dihitung dari jam mulai rekaman, dan jam ini bisa dikoreksi.
Garis hitung digambar dengan menyeret jari di layar. Hasilnya tetap dipisah Arah 1 dan Arah 2, ada rekap smp, dan bisa diunduh sebagai CSV.
Layar dijaga tetap menyala selama menghitung, dan hitungan tersimpan otomatis di HP kalau halaman tidak sengaja tertutup.
Ada pilihan model Ringan (lebih cepat di HP) atau Akurat.
Done


## CCTV Dishub Kab. Tangerang

Mode **CCTV Dishub** menghitung langsung dari kamera di https://cctv-dishub.tangerangkab.go.id/cctv-map.
Server Dishub tidak mengizinkan akses dari situs lain (CORS), jadi stream diambil lewat proxy kecil
`worker.js` yang dipasang gratis di Cloudflare Workers.

### Pasang proxy (sekali saja, ±5 menit)
1. Daftar/masuk di https://dash.cloudflare.com (gratis).
2. **Workers & Pages → Create → Create Worker** → beri nama mis. `cctv-proxy` → **Deploy**.
3. **Edit code**, hapus isinya, tempel seluruh isi `worker.js`, lalu **Deploy**.
4. Salin alamatnya, mis. `https://cctv-proxy.namaanda.workers.dev`.
   Cek: buka `https://cctv-proxy.namaanda.workers.dev/cameras` → harus muncul daftar kamera (JSON).
5. (Opsional) **Settings → Variables** → tambah `ALLOW_ORIGIN` = alamat aplikasi Anda
   (mis. `https://franly27.github.io`) agar proxy hanya bisa dipakai aplikasi ini.

### Pakai
1. Tekan **CCTV Dishub**, tempel alamat proxy (tersimpan otomatis), pilih kamera, **Sambungkan**.
2. Buat garis hitung, tekan **Mulai**. Arah 1/2, smp, rekap interval, dan CSV sama seperti mode lain.

Catatan:
- Waktu kejadian = jam siaran, sudah dikoreksi jeda stream HLS (biasanya 10–30 detik).
- Tab harus tetap terbuka di depan; browser menghentikan deteksi bila tab disembunyikan.
- Kamera CCTV kota umumnya beresolusi rendah dan dipasang tinggi — model **Akurat** biasanya lebih baik.
- Gunakan secukupnya (satu kamera per sesi). Untuk survei resmi, sebaiknya koordinasi dengan Dishub.
