# Guida al Deployment di Workforce Manager

Questa guida spiega come deployare l'applicazione Workforce Manager, con il backend su Render e il frontend su Vercel.

## Prerequisiti

- Un account [GitHub](https://github.com/)
- Un account [Render](https://render.com/)
- Un account [Vercel](https://vercel.com/)
- Il codice sorgente dell'applicazione in un repository GitHub

## 1. Preparazione del Repository

Assicurati che il repository contenga i seguenti file di configurazione:

- `render.yaml` (per Render)
- `client/vercel.json` (per Vercel)
- `client/.env.production` (per le variabili d'ambiente di produzione)

## 2. Deployment del Backend su Render

### Metodo 1: Utilizzo del Blueprint (render.yaml)

1. Accedi al tuo account Render
2. Vai su "Blueprints" nel menu di navigazione
3. Clicca su "New Blueprint Instance"
4. Collega il tuo repository GitHub
5. Render rileverà automaticamente il file `render.yaml` e configurerà il servizio
6. Configura le variabili d'ambiente richieste:
   - `SESSION_SECRET`: Una stringa casuale per la sicurezza delle sessioni
   - `DATABASE_URL`: URL di connessione al database PostgreSQL
   - `SMTP_HOST`: Host del server SMTP per l'invio di email
   - `SMTP_PORT`: Porta del server SMTP
   - `SMTP_USER`: Username per l'autenticazione SMTP
   - `SMTP_PASS`: Password per l'autenticazione SMTP
   - `EMAIL_FROM`: Indirizzo email mittente
7. Clicca su "Create Blueprint Instance"

### Metodo 2: Creazione Manuale del Servizio

1. Accedi al tuo account Render
2. Vai su "Web Services" nel menu di navigazione
3. Clicca su "New Web Service"
4. Collega il tuo repository GitHub
5. Configura il servizio:
   - **Name**: workforce-manager-backend
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
6. Aggiungi le stesse variabili d'ambiente elencate nel Metodo 1
7. Clicca su "Create Web Service"

## 3. Deployment del Frontend su Vercel

1. Accedi al tuo account Vercel
2. Clicca su "New Project"
3. Importa il tuo repository GitHub
4. Configura il progetto:
   - **Framework Preset**: Vite
   - **Root Directory**: client
   - **Build Command**: `npm install && npm run build`
   - **Output Directory**: dist
5. Aggiungi le seguenti variabili d'ambiente:
   - `VITE_API_URL`: URL del backend su Render (es. https://workforce-manager-backend.onrender.com)
   - `VITE_WS_URL`: URL WebSocket del backend (es. wss://workforce-manager-backend.onrender.com)
6. Clicca su "Deploy"

## 4. Configurazione del CORS

Se riscontri problemi di CORS dopo il deployment, assicurati che il backend sia configurato per accettare richieste dal dominio Vercel. Modifica il file `server/index.ts` per includere il dominio Vercel nell'elenco delle origini consentite.

## 5. Verifica del Deployment

1. Accedi all'applicazione frontend tramite l'URL fornito da Vercel
2. Verifica che l'applicazione possa comunicare correttamente con il backend
3. Testa le funzionalità principali:
   - Login/Logout
   - Gestione degli utenti
   - Gestione dei turni
   - Notifiche in tempo reale

## 6. Configurazione del Dominio Personalizzato (Opzionale)

### Per il Backend (Render)

1. Vai al tuo servizio web su Render
2. Vai alla sezione "Settings"
3. Scorri fino a "Custom Domains"
4. Clicca su "Add Custom Domain"
5. Segui le istruzioni per configurare il tuo dominio personalizzato

### Per il Frontend (Vercel)

1. Vai al tuo progetto su Vercel
2. Vai alla sezione "Settings" > "Domains"
3. Aggiungi il tuo dominio personalizzato
4. Segui le istruzioni per configurare i record DNS

## 7. Monitoraggio e Manutenzione

### Render

- Vai alla dashboard del tuo servizio per monitorare l'utilizzo delle risorse, i log e lo stato del servizio
- Configura avvisi per essere notificato in caso di problemi

### Vercel

- Vai alla dashboard del tuo progetto per monitorare le distribuzioni, i log e le analitiche
- Utilizza la funzionalità di anteprima per testare le modifiche prima di distribuirle in produzione

## Risoluzione dei Problemi

### Problema di Connessione al Backend

Se il frontend non riesce a connettersi al backend:

1. Verifica che il backend sia in esecuzione
2. Controlla che le variabili d'ambiente `VITE_API_URL` e `VITE_WS_URL` siano configurate correttamente
3. Verifica che il CORS sia configurato correttamente sul backend

### Errori di Build

Se riscontri errori durante la build:

1. Controlla i log di build su Render/Vercel
2. Assicurati che tutte le dipendenze siano installate correttamente
3. Verifica che i comandi di build siano configurati correttamente

### Problemi con le Sessioni

Se gli utenti vengono disconnessi frequentemente:

1. Verifica che `SESSION_SECRET` sia configurato correttamente
2. Controlla che il database delle sessioni sia configurato correttamente

## Script di Deployment Automatico

Per semplificare il processo di deployment, puoi utilizzare lo script `deploy.sh` incluso nel repository:

```bash
./deploy.sh
```

Questo script:
1. Verifica se ci sono modifiche non committate
2. Esegue il push delle modifiche su GitHub
3. Avvia automaticamente il processo di deployment su Render e Vercel (se configurati per il deployment automatico)