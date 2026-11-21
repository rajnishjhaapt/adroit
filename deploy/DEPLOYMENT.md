# Deploying Adroit on a Hostinger Ubuntu VPS

This guide installs everything on one Ubuntu 22.04/24.04 VPS:

- **Nginx** serves the React build and passes `/api/*` to the backend.
- **Uvicorn** runs the FastAPI backend on `127.0.0.1:8001`.
- **MongoDB 7** runs on the same server with a login required, and is never exposed to the internet.

The Emergent preview database is NOT used. Production gets its own persistent MongoDB at `/var/lib/mongodb`.

Replace `your-domain.com` everywhere in this guide.

---

## 1. Server basics
```bash
ssh root@YOUR_VPS_IP
apt update && apt upgrade -y
apt install -y nginx git curl gnupg python3 python3-venv python3-pip ufw
adduser --system --group --home /opt/adroit adroit
ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw enable      # MongoDB port 27017 stays closed
```
At your domain registrar, point `A` records for `your-domain.com` and `www.your-domain.com` at the VPS IP.

## 2. Install MongoDB 7
```bash
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse" > /etc/apt/sources.list.d/mongodb-org-7.0.list
apt update && apt install -y mongodb-org
systemctl enable --now mongod
```
On Ubuntu 24.04 (noble), use the `jammy` repository line if `noble` is not yet listed, or install MongoDB 8.0 from its own repository.

## 3. Secure MongoDB and create the app user
```bash
mongosh
```
```js
use admin
db.createUser({ user: "root_admin", pwd: passwordPrompt(), roles: ["root"] })
use adroit_prod
db.createUser({ user: "adroit_app", pwd: passwordPrompt(), roles: [{ role: "readWrite", db: "adroit_prod" }] })
exit
```
Then turn on login checks and keep MongoDB local-only. Edit `/etc/mongod.conf`:
```yaml
net:
  port: 27017
  bindIp: 127.0.0.1
security:
  authorization: enabled
```
```bash
systemctl restart mongod
```
The app user has read/write access to `adroit_prod` only (least privilege).

## 4. Upload the code
Use either Git (push the project from Emergent to GitHub first) or SFTP. The `/opt/adroit` folder must contain `backend/` and `frontend/`.
```bash
cd /opt/adroit && git clone https://github.com/YOU/YOUR_REPO.git src && cp -r src/backend src/frontend src/deploy . && rm -rf src
chown -R adroit:adroit /opt/adroit
```

## 5. Backend (FastAPI + Uvicorn)
```bash
cd /opt/adroit/backend
python3 -m venv venv
venv/bin/pip install --upgrade pip
venv/bin/pip install -r requirements.txt
cp ../deploy/backend.env.example .env
venv/bin/python scripts/make_admin_hash.py      # paste the output into .env as ADMIN_PASSWORD_HASH
nano .env                                        # set MONGO_URL password, CORS_ORIGINS, domain
chown adroit:adroit .env && chmod 600 .env
cp ../deploy/adroit-backend.service /etc/systemd/system/
systemctl daemon-reload && systemctl enable --now adroit-backend
curl -s http://127.0.0.1:8001/api/services | head -c 200   # should list the services
```
On first start the backend creates its indexes and loads the services, website content, partners and team into the empty database.

If `pip install` fails on the `emergentintegrations` package, remove that line from `requirements.txt`. The website doesn't use it.

## 6. Frontend (production build)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt install -y nodejs && npm i -g yarn
cd /opt/adroit/frontend
cp ../deploy/frontend.env.production.example .env.production && nano .env.production   # your domain
yarn install --frozen-lockfile
yarn build
mkdir -p /var/www/adroit && rsync -a --delete build/ /var/www/adroit/
```
Re-run `yarn build` and `rsync` after any frontend change. The site URL is built into the files at build time.

## 7. Nginx and HTTPS
```bash
cp /opt/adroit/deploy/nginx/adroit.conf /etc/nginx/sites-available/adroit
nano /etc/nginx/sites-available/adroit                 # set your domain
ln -s /etc/nginx/sites-available/adroit /etc/nginx/sites-enabled/ && rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
apt install -y certbot python3-certbot-nginx
certbot --nginx -d your-domain.com -d www.your-domain.com --redirect
```
HTTPS is required: the admin session cookie is `Secure`, `HttpOnly` and `SameSite=Strict`, so admin login only works over `https://`. The frontend and API share one domain, so cookies and CORS work without extra setup. Keep `CORS_ORIGINS` set to your exact https origins.

## 8. Production checks (do these before announcing the site)
1. `https://your-domain.com` loads and every page opens, including deep links such as `/services/gst-services` after a refresh.
2. Submit the contact form, then the booking form. You should get a reference ID.
3. Go to `https://your-domain.com/admin`. It redirects to `/admin/login`. Sign in, check the enquiries are listed, change a status, add a note and export the CSV.
4. **Persistence test:** `systemctl restart adroit-backend mongod`. Log in again; the enquiries must still be there.
5. Without logging in, `curl -i https://your-domain.com/api/admin/stats` must return `401`.
6. In the browser's DevTools → Application → Cookies, `adroit_session` shows HttpOnly, Secure and SameSite Strict.
7. Change the admin password from the dashboard (**Change Password**).

## 9. Backups (daily, 14 days kept)
```bash
cp /opt/adroit/deploy/scripts/backup_mongo.sh /usr/local/bin/adroit-backup && chmod 700 /usr/local/bin/adroit-backup
adroit-backup                                     # test once
echo "30 2 * * * root /usr/local/bin/adroit-backup >> /var/log/adroit-backup.log 2>&1" > /etc/cron.d/adroit-backup
```
Backups go to `/var/backups/adroit/`. Also copy them off the server regularly, for example to your PC or cloud storage:
```bash
scp root@YOUR_VPS_IP:/var/backups/adroit/adroit-*.archive.gz ./
```
Turn on Hostinger's VPS snapshots as well.

### Restore
```bash
systemctl stop adroit-backend
mongorestore --uri="$(grep ^MONGO_URL= /opt/adroit/backend/.env | cut -d= -f2-)" --gzip \
  --archive=/var/backups/adroit/adroit-YYYY-MM-DD-HHMM.archive.gz --drop
systemctl start adroit-backend
```
`--drop` replaces the current collections with the backup. Leave it out to merge instead.

### Move data from the Emergent preview (optional)
The preview database holds no real enquiries yet; fresh installs load the services and content automatically. If you've edited content in the preview, export it there with `mongodump --uri="<preview MONGO_URL>" --db=<DB_NAME> --gzip --archive=preview.gz`. Then restore it on the VPS with `mongorestore ... --nsFrom='<DB_NAME>.*' --nsTo='adroit_prod.*'`.

## 10. Updating the site later
```bash
cd /opt/adroit && git pull   # or upload the changed files
backend/venv/bin/pip install -r backend/requirements.txt && systemctl restart adroit-backend
cd frontend && yarn install --frozen-lockfile && yarn build && rsync -a --delete build/ /var/www/adroit/
```

## Logs
- Backend: `journalctl -u adroit-backend -f`
- Nginx: `/var/log/nginx/error.log`
- MongoDB: `/var/log/mongodb/mongod.log`

## Before you publish
Have the CA and tax content reviewed against applicable ICAI and other regulatory guidelines.
