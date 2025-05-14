# Istruzioni per il Deploy su Render

Questo file contiene istruzioni specifiche per il deploy dell'applicazione su Render.

## Configurazione

Il repository è già configurato per il deploy su Render con i seguenti file:

- `render.yaml`: Configurazione principale per Render
- `render-build.sh`: Script personalizzato per il build
- `.nvmrc` e `.node-version`: Specificano la versione di Node.js
- `.npmrc`: Configurazione npm per il build
- `Procfile`: Definisce il comando per avviare l'applicazione

## Variabili d'Ambiente

È necessario configurare le seguenti variabili d'ambiente su Render:

```
NODE_ENV=production
SESSION_SECRET=da_vittorino_workforce_manager_secret_key_2024
DATABASE_URL=postgresql://neondb_owner:npg_ST1xy8lAVqLF@ep-cool-bar-a4i0caol-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=davittorino.staff@gmail.com
SMTP_PASS=qfgz hzjz lnpl fzjr
EMAIL_FROM=Da Vittorino Staff <davittorino.staff@gmail.com>
```

## Procedura di Deploy

1. Crea un account su Render se non ne hai uno
2. Collega il tuo repository GitHub a Render
3. Crea un nuovo Web Service utilizzando il repository
4. Render rileverà automaticamente il file `render.yaml` e configurerà il servizio
5. Aggiungi le variabili d'ambiente elencate sopra
6. Clicca su "Create Web Service"

## Risoluzione dei Problemi

Se incontri problemi durante il deploy:

1. Verifica i log di build su Render
2. Assicurati che tutte le variabili d'ambiente siano configurate correttamente
3. Controlla che la versione di Node.js sia impostata su 18.x
4. Se necessario, esegui un deploy manuale dal dashboard di Render

## Note

- L'applicazione utilizza Node.js 18.x
- Il frontend viene compilato durante la fase di build
- Il backend è un'applicazione Express che serve sia l'API che il frontend
- L'applicazione si connette a un database PostgreSQL su Neon.tech