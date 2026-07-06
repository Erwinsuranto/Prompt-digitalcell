```
# FINALISASI MODUL AUTHENTICATION DIGITAL CELL (100% PRODUCTION READY)

Lanjutkan project Digital Cell.

Jangan membuat modul authentication baru.

Jangan mengubah alur transaksi yang sudah stabil.

Jangan merusak Checkout, Wallet, Deposit, Refund, Riwayat Transaksi, Dashboard Admin, Produk, Digiflazz Sync, Notifikasi, Recovery, maupun State Machine.

Lakukan audit terlebih dahulu terhadap seluruh modul Authentication yang sudah dikerjakan.

==================================================

TARGET

Menyelesaikan seluruh Authentication hingga benar-benar Production Ready.

Target akhir:

Authentication
Profile
Google Login
Email OTP
Session
Avatar
Admin User
SMTP
OAuth

selesai 100%.

==================================================

AUDIT

Periksa kembali seluruh modul.

Pastikan tidak ada:

hardcode

dummy

mock

legacy auth

placeholder

duplicate endpoint

deprecated package

password plaintext

OTP plaintext

token bocor

session bocor

endpoint tanpa auth

admin endpoint tanpa role

IDOR

Broken Access Control

Race Condition

==================================================

EMAIL OTP

Pastikan flow:

Register

↓

Generate OTP

↓

Hash OTP

↓

Simpan Expired Time

↓

Kirim Email

↓

Verifikasi

↓

Email Verified

↓

Login

Resend OTP wajib memiliki:

Cooldown

Rate Limit

Expired

Attempt Limit

==================================================

SMTP

Audit seluruh EmailService.

Gunakan ENV.

Jangan hardcode.

Support:

SMTP Gmail

SMTP Brevo

SMTP Sendgrid

SMTP Mailgun

SMTP lainnya

Email template:

OTP

Reset Password

Login Baru

Password Diganti

Email Diganti

Google Account Linked

==================================================

GOOGLE LOGIN

Pastikan memakai OAuth terbaru.

Audit:

Google Token

Audience

Issuer

Expiration

Nonce

Email

Email Verified

Picture

Sub

Google ID

Jangan percaya data frontend.

Backend wajib verifikasi token Google.

==================================================

LINK ACCOUNT

Jika email sudah ada:

Hubungkan Google.

Jangan buat akun baru.

Jika user register Google dahulu:

Lalu register Email.

Hubungkan akun.

Satu email = satu user.

==================================================

PROFILE

Lengkapi.

User dapat:

Edit Nama

Edit Username

Edit Bio

Edit Nomor HP

Edit Email

Upload Avatar

Hapus Avatar

Lihat Login History

Lihat Device Aktif

Logout Device

Logout Semua Device

==================================================

AVATAR

Resize otomatis.

Compress otomatis.

Generate Thumbnail.

Rename Random.

Storage aman.

Delete avatar lama.

Tidak boleh overwrite.

==================================================

PASSWORD

Hash bcrypt/argon.

Password lama wajib dicek.

Password baru wajib policy.

Logout seluruh device.

Tambah Password Changed At.

==================================================

LOGIN HISTORY

Catat:

Browser

OS

Device

IP

Login Provider

Tanggal

Jam

Status

==================================================

SESSION

Session Management:

Device Aktif

Refresh Token

Revoke Session

Logout Device

Logout Semua

Session Expired

==================================================

SECURITY

Audit:

JWT

Refresh Token

CSRF

CORS

Helmet

Cookie

Session Fixation

Brute Force

Rate Limit

OTP Abuse

Email Abuse

Google Abuse

Replay Attack

==================================================

ADMIN

Selesaikan halaman Kelola User.

Admin dapat:

Search

Filter

Pagination

Detail User

Reset Password

Verifikasi Email

Verifikasi Nomor

Aktif

Nonaktif

Suspend

Unsuspend

Ganti Role

Lihat Login History

Lihat Session

Lihat Avatar

Hapus Avatar

==================================================

STATISTIK

Dashboard Authentication.

Jumlah User

User Google

User Email

Email Belum Verifikasi

Login Hari Ini

Login Minggu Ini

Login Bulan Ini

Login Gagal

OTP Terkirim

OTP Gagal

Top Device

Top Browser

==================================================

NOTIFICATION

Kirim notifikasi ketika:

Login Baru

Password Diganti

Email Diganti

Nomor Diganti

Avatar Diganti

Google Connected

Google Removed

==================================================

DATABASE

Audit seluruh collection.

Pastikan index.

Pastikan migration.

Pastikan backward compatible.

==================================================

TEST

Lakukan simulasi:

Register

OTP salah

OTP expired

Spam resend OTP

Login Email

Login Google

Link Account

Reset Password

Upload Avatar

Edit Profil

Logout Device

Logout Semua

Admin Reset Password

Admin Suspend User

Admin Unsuspend User

Admin Verify Email

Admin Verify Phone

Double Request

Spam Login

Replay Token

Expired JWT

Expired Refresh Token

==================================================

VALIDASI

Jalankan:

npm run lint

npm run build

Pastikan:

Tidak ada TypeScript Error

Tidak ada Runtime Error

Tidak ada Build Error

==================================================

PRODUCTION CHECKLIST

Pastikan:

SMTP tinggal isi ENV.

Google OAuth tinggal isi Client ID.

Google Secret tinggal isi ENV.

Avatar Storage tinggal pilih Local/S3.

Semua endpoint production siap.

Semua migration selesai.

Tidak ada dummy.

Tidak ada mock.

Tidak ada hardcode.

==================================================

LAPORAN AKHIR

Berikan laporan lengkap:

1. File yang diubah.

2. Endpoint baru.

3. Endpoint yang diperbaiki.

4. Collection yang berubah.

5. Migration yang dibuat.

6. ENV baru.

7. Audit keamanan.

8. Hasil simulasi.

9. Risiko yang masih tersisa.

10. Production Readiness (%).

11. Skor keamanan Authentication.

12. Checklist Go Live.

13. Daftar pekerjaan yang benar-benar tersisa (jika ada), tanpa membuat fitur baru di luar ruang lingkup Authentication.

Jangan berhenti sampai seluruh modul Authentication benar-benar selesai dan siap Production.
```
