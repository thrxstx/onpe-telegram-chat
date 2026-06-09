# ONPE Monitor

Monitorea los resultados de la segunda vuelta y manda actualizaciones a Telegram cada 15 minutos.

## Deploy en Vercel

### 1. Sube a GitHub
```bash
git init
git add .
git commit -m "init"
git remote add origin https://github.com/TU_USUARIO/onpe-monitor.git
git push -u origin main
```

### 2. Importa en Vercel
- Ve a https://vercel.com/new
- Importa el repo
- En "Environment Variables" agrega:

| Variable | Valor |
|---|---|
| `TELEGRAM_USER` | tu usuario de Telegram sin @ (ej: thxrstx) |
| `CRON_SECRET` | cualquier string secreto (ej: mi-clave-123) |

### 3. Deploy
Vercel detecta el vercel.json y activa el cron cada 15 minutos automáticamente.
