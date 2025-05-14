# Deploy Semplificato su Render

Questo approccio semplificato per il deploy su Render evita problemi di build con Vite e React.

## Approccio

Invece di compilare l'applicazione React con Vite, utilizziamo:

1. **Server Express semplificato**: Un server minimo che serve file statici e gestisce alcune API di base
2. **HTML statico**: Una pagina HTML statica che mostra un messaggio di benvenuto
3. **Package.json minimale**: Solo le dipendenze essenziali per il server

## File Chiave

- `render-deploy.sh`: Script di deploy che copia i file necessari nella directory di output
- `server-simplified.js`: Server Express semplificato
- `static-index.html`: Pagina HTML statica
- `render-package.json`: Package.json con dipendenze minimali

## Come Funziona

1. Lo script `render-deploy.sh` sostituisce il package.json con la versione semplificata
2. Installa solo le dipendenze necessarie
3. Copia il server semplificato e l'HTML statico nella directory di output
4. Render avvia il server con `npm start`

## Vantaggi

- Evita problemi di build con Vite e React
- Riduce il tempo di deploy
- Minimizza le dipendenze
- Fornisce un'applicazione funzionante anche se molto semplificata

## Limitazioni

- Non include l'applicazione React completa
- Funzionalità limitate rispetto all'applicazione originale
- Solo una pagina statica con login di esempio

## Prossimi Passi

Una volta che questo deploy semplificato funziona, puoi:

1. Gradualmente aggiungere funzionalità al server
2. Integrare l'applicazione React compilata manualmente
3. Testare e risolvere eventuali problemi di build

## Variabili d'Ambiente

Sono necessarie le seguenti variabili d'ambiente:

```
NODE_ENV=production
SESSION_SECRET=da_vittorino_workforce_manager_secret_key_2024
PORT=10000
```

Le altre variabili (DATABASE_URL, SMTP_*, ecc.) non sono necessarie per questa versione semplificata. 