# StaffSync - Sistema di Gestione del Personale

## Preparazione per il Deploy

Abbiamo configurato l'applicazione per il deploy su:
- **Backend**: Render.com
- **Frontend**: Vercel

### Modifiche principali:

1. **Backend (server)**:
   - Aggiunta configurazione CORS per supportare richieste cross-origin
   - Configurazione dei cookie di sessione per funzionare tra domini diversi
   - Modificato il server per ascoltare su tutte le interfacce di rete
   - Creato file `render.yaml` per la configurazione del deploy su Render

2. **Frontend (client)**:
   - Aggiunta variabile d'ambiente per l'URL dell'API
   - Modificato il client per utilizzare l'URL dell'API configurato
   - Creato file `vercel.json` per la configurazione del deploy su Vercel

3. **Documentazione**:
   - Creato file `DEPLOY.md` con istruzioni dettagliate per il deploy
   - Aggiornato README con informazioni sul deploy

## Istruzioni per il Deploy

Per istruzioni dettagliate sul deploy, consulta il file [DEPLOY.md](./DEPLOY.md).

## Struttura del Progetto

- `client/`: Applicazione frontend React
- `server/`: API backend Node.js/Express
- `shared/`: Codice condiviso tra frontend e backend
- `render.yaml`: Configurazione per il deploy su Render
- `vercel.json`: Configurazione per il deploy su Vercel

## Sviluppo Locale

1. Clona il repository
2. Installa le dipendenze: `npm install`
3. Avvia il server di sviluppo: `npm run dev`
4. In un altro terminale, avvia il client: `cd client && npm run dev`

## Variabili d'Ambiente

### Backend (.env)
```
DATABASE_URL=...
EMAIL_USER=...
EMAIL_APP_PASSWORD=...
SESSION_SECRET=...
NODE_ENV=production
```

### Frontend (client/.env)
```
VITE_API_URL=https://staffsync-backend.onrender.com
``` 