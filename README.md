# AR Maintenance Coursework (Windows Setup)

This project has:
- `server/` Express + MariaDB backend
- `client/` React + Vite frontend

## 1. Prerequisites (Windows)
- Install `Node.js` (LTS recommended)
- Install `XAMPP` (for MariaDB + phpMyAdmin)

## 2. Start MariaDB in XAMPP
1. Open **XAMPP Control Panel**
2. Start **Apache** and **MySQL**
3. Click **Admin** next to MySQL (opens phpMyAdmin)

## 3. Create Database + Tables
1. In phpMyAdmin, go to **Import**
2. Select this file:
   - `server/sql/auth_schema.sql`
3. Click **Go**

This creates database `ar_maintenance` and seeds sample data.

## 4. Backend Environment
The backend uses `server/.env` (already included in this repo).  
Default DB values are:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=ar_maintenance
```

If your local MariaDB uses a different password/user, update `server/.env`.

## 5. Install Dependencies
Open two terminals in the project root.

Terminal 1 (backend):
```powershell
cd server
npm install
```

Terminal 2 (frontend):
```powershell
cd client
npm install
```

## 6. Run the App
Terminal 1 (backend):
```powershell
cd server
npm start
```
Backend runs on `http://localhost:8080`

Terminal 2 (frontend):
```powershell
cd client
npm run dev
```
Frontend runs on `http://localhost:5173`

Open: `http://localhost:5173`

## 7. Test Login Credentials
After running `auth_schema.sql`, use either:

- `admin.tech@example.com` / `Test123!`
- `field.engineer@example.com` / `Test123!`

## 8. Troubleshooting
- If login/session calls fail, make sure backend is running on `8080`.
- If DB errors occur, re-import `server/sql/auth_schema.sql` in phpMyAdmin.
- If UI changes do not appear, hard refresh browser (`Ctrl+F5`).
