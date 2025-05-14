# Riepilogo Configurazione Deployment

## Architettura

- **Backend**: Render (Node.js/Express)
- **Frontend**: Vercel (React/Vite)
- **Database**: PostgreSQL (Neon.tech)

## File di Configurazione

1. **Backend (Render)**
   - `render.yaml`: Configurazione del servizio web
   - `server/index.ts`: Aggiunta configurazione CORS per supportare il frontend su Vercel

2. **Frontend (Vercel)**
   - `client/vercel.json`: Configurazione del deployment Vercel
   - `client/.env.production`: Variabili d'ambiente di produzione
   - `client/src/lib/config.ts`: Configurazione URL API e WebSocket

3. **Utilità**
   - `deploy.sh`: Script per semplificare il deployment
   - `DEPLOYMENT.md`: Guida dettagliata al deployment

## Variabili d'Ambiente

### Backend (Render)
- `NODE_ENV`: production
- `PORT`: Porta del server (default: 5000)
- `SESSION_SECRET`: Chiave per la sicurezza delle sessioni
- `DATABASE_URL`: URL di connessione al database PostgreSQL
- `SMTP_HOST`: Host del server SMTP
- `SMTP_PORT`: Porta del server SMTP
- `SMTP_USER`: Username SMTP
- `SMTP_PASS`: Password SMTP
- `EMAIL_FROM`: Indirizzo email mittente

### Frontend (Vercel)
- `VITE_API_URL`: URL del backend (es. https://workforce-manager-backend.onrender.com)
- `VITE_WS_URL`: URL WebSocket (es. wss://workforce-manager-backend.onrender.com)

## Comunicazione tra Frontend e Backend

- **API REST**: Utilizza `getApiUrl()` da `config.ts` per costruire gli URL delle API
- **WebSocket**: Utilizza `getWsUrl()` da `config.ts` per la connessione WebSocket
- **CORS**: Configurato sul backend per accettare richieste da domini Vercel specifici

## Prossimi Passi

1. Creare account su Render e Vercel
2. Collegare il repository GitHub a entrambi i servizi
3. Configurare le variabili d'ambiente
4. Avviare il deployment
5. Testare la connessione tra frontend e backend
6. Configurare domini personalizzati (opzionale) 