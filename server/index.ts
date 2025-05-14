import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic, log } from "./vite.js";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser(process.env.SESSION_SECRET || "keyboard cat")); // Parse cookies with the same secret as session

// Configurazione CORS per consentire richieste dal frontend su Vercel
const allowedOrigins = [
  'http://localhost:5173',                      // Sviluppo locale frontend
  'http://localhost:3000',                      // Sviluppo locale frontend (alternativo)
  'https://workforce-manager.vercel.app',       // Produzione su Vercel (aggiorna con il tuo dominio)
  'https://davittorino-staff.vercel.app',       // Dominio alternativo
  'https://workspace-manager-2.onrender.com',   // Backend su Render
  'https://workspace-manager-git-main-enea250705.vercel.app', // Vercel deployment URL
  'https://workspace-manager-enea250705.vercel.app',          // Vercel deployment URL
  'https://client-vert-eight.vercel.app',       // Nuovo URL di deployment Vercel
  'https://workforce-manager-client.vercel.app' // Aggiungi qualsiasi nuovo dominio qui
];

app.use(cors({
  origin: function(origin, callback) {
    // Consenti richieste senza origin (come app mobile o Postman)
    if (!origin) {
      console.log('Richiesta senza origin consentita');
      return callback(null, true);
    }
    
    console.log(`Richiesta CORS da origin: ${origin}`);
    
    // Opzione 1: Consenti tutte le origini in produzione (più permissivo)
    // return callback(null, true);
    
    // Opzione 2: Controlla contro la lista di origini consentite
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      console.log(`Origin consentito: ${origin}`);
      callback(null, true);
    } else {
      // In produzione, prova a consentire tutti i domini .vercel.app
      if (origin.endsWith('.vercel.app')) {
        console.log(`Origin Vercel consentito: ${origin}`);
        return callback(null, true);
      }
      
      console.log(`Origin bloccato dal CORS: ${origin}`);
      callback(new Error('Non consentito dal CORS'));
    }
  },
  credentials: true, // Importante per le sessioni/cookie
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With', 'X-HTTP-Method-Override'],
  exposedHeaders: ['Set-Cookie']
}));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Configura il server per ascoltare su tutte le interfacce
  const port = process.env.PORT || 5000;
  server.listen({
    port,
    host: "0.0.0.0", // Ascolta su tutte le interfacce di rete
  }, () => {
    log(`Server in esecuzione sulla porta ${port} in modalità ${app.get('env')}`);
  });
})();
