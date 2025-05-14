# Guida al Deploy di StaffSync

Questa guida spiega come effettuare il deploy dell'applicazione StaffSync utilizzando:
- **Backend**: Render.com
- **Frontend**: Vercel

## 1. Deploy del Backend su Render

### Prerequisiti
- Un account su [Render](https://render.com/)
- Accesso al repository Git del progetto

### Passi per il Deploy

1. **Accedi a Render.com** e vai alla dashboard.

2. **Crea un nuovo Web Service**:
   - Clicca su "New" e seleziona "Web Service"
   - Collega il tuo repository Git
   - Seleziona il branch da deployare (generalmente `main` o `master`)

3. **Configura il servizio**:
   - **Nome**: `staffsync-backend` (o un nome a tua scelta)
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
   - **Piano**: Seleziona il piano gratuito o a pagamento in base alle tue esigenze

4. **Configura le variabili d'ambiente**:
   Vai alla sezione "Environment" e aggiungi le seguenti variabili:
   - `DATABASE_URL`: URL del tuo database PostgreSQL su Neon
   - `EMAIL_USER`: Indirizzo email per l'invio delle notifiche
   - `EMAIL_APP_PASSWORD`: Password dell'applicazione per l'account email
   - `SESSION_SECRET`: Una stringa casuale lunga per la sicurezza delle sessioni (Render può generarla automaticamente)
   - `NODE_ENV`: `production`

5. **Avvia il deploy** cliccando su "Create Web Service".

6. **Verifica il deploy**:
   - Attendi il completamento del deploy
   - Verifica che il servizio sia attivo visitando l'URL fornito da Render
   - Testa l'endpoint `/api/auth/me` per verificare che il backend risponda correttamente

## 2. Deploy del Frontend su Vercel

### Prerequisiti
- Un account su [Vercel](https://vercel.com/)
- Accesso al repository Git del progetto

### Passi per il Deploy

1. **Accedi a Vercel** e vai alla dashboard.

2. **Importa il progetto**:
   - Clicca su "Add New" e seleziona "Project"
   - Importa il tuo repository Git
   - Seleziona il repository del progetto

3. **Configura il progetto**:
   - **Framework Preset**: Vite
   - **Build Command**: `cd client && npm install && npm run build`
   - **Output Directory**: `client/dist`
   - **Install Command**: `cd client && npm install`

4. **Configura le variabili d'ambiente**:
   Vai alla sezione "Environment Variables" e aggiungi:
   - `VITE_API_URL`: URL completo del tuo backend su Render (es. `https://staffsync-backend.onrender.com`)

5. **Avvia il deploy** cliccando su "Deploy".

6. **Verifica il deploy**:
   - Attendi il completamento del deploy
   - Accedi all'applicazione utilizzando l'URL fornito da Vercel
   - Verifica che l'applicazione si connetta correttamente al backend

## 3. Configurazione dei Domini Personalizzati (Opzionale)

Se desideri utilizzare domini personalizzati:

### Per Render:
1. Vai alle impostazioni del tuo Web Service
2. Seleziona "Custom Domain"
3. Segui le istruzioni per configurare il tuo dominio

### Per Vercel:
1. Vai alle impostazioni del tuo progetto
2. Seleziona "Domains"
3. Aggiungi il tuo dominio e segui le istruzioni

**Importante**: Se utilizzi domini personalizzati, ricordati di aggiornare:
- Gli allowed origins nel file CORS del backend
- La variabile d'ambiente `VITE_API_URL` nel frontend
- Il dominio del cookie nella configurazione della sessione

## 4. Risoluzione dei Problemi

### Problemi di CORS
Se riscontri errori CORS:
1. Verifica che l'URL del frontend sia incluso negli allowed origins nel backend
2. Controlla che la configurazione dei cookie di sessione sia corretta

### Problemi di Autenticazione
Se l'autenticazione non funziona:
1. Verifica che i cookie vengano correttamente impostati (controlla la Console del browser)
2. Assicurati che la configurazione SameSite e Secure dei cookie sia corretta
3. Controlla che il dominio dei cookie sia configurato correttamente

### Problemi di Connessione al Database
Se ci sono problemi di connessione al database:
1. Verifica che la variabile `DATABASE_URL` sia corretta
2. Controlla che il database su Neon sia attivo e accessibile
3. Verifica che l'IP del servizio Render non sia bloccato dalle regole di sicurezza del database

## 5. Monitoraggio e Manutenzione

### Monitoraggio
- Utilizza la dashboard di Render per monitorare il backend
- Utilizza la dashboard di Vercel per monitorare il frontend
- Configura notifiche per eventuali errori o downtime

### Aggiornamenti
Per aggiornare l'applicazione:
1. Effettua il push dei cambiamenti al repository Git
2. Render e Vercel rileveranno automaticamente i cambiamenti e avvieranno un nuovo deploy

### Backup
Assicurati di configurare backup regolari del database su Neon per evitare perdite di dati. 