# ONPE Monitor 🗳️

Monitorea los resultados de la segunda vuelta en tiempo real y te manda actualizaciones a Telegram cada 15 minutos.

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
- Importa el repo de GitHub
- En "Environment Variables" agrega:

| Variable | Valor |
|---|---|
| `TELEGRAM_USER` | `@tuusuario` |
| `CALLMEBOT_API_KEY` | La key que te dio @CallMeBot_txtbot |
| `CRON_SECRET` | Cualquier string secreto (ej: `mi-clave-segura-123`) |

### 3. Deploy
Vercel detecta el `vercel.json` y activa el cron automáticamente.
El endpoint `/api/monitor` se ejecutará cada 15 minutos.

## Variables de entorno

Copia `.env.example` a `.env` para desarrollo local.
