Як налаштувати .env для Cloudflare R2:
Тобі потрібно створити бакет в R2 і отримати API токени.

Фрагмент коду
# Cloudflare R2 Settings
S3_ENDPOINT=https://<ТВІЙ_ACCOUNT_ID>.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET_NAME=elearn-bucket
S3_ACCESS_KEY_ID=<Твій Access Key>
S3_SECRET_ACCESS_KEY=<Твій Secret Key>

# Підключи свій домен в налаштуваннях R2 бакета (Settings -> Public Access -> Custom Domain)
S3_PUBLIC_URL=https://files.tviy-sajt.com