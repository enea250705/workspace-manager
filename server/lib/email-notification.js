// Servizio di notifica email che utilizza Python come backend

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const log = require('../vite').log;

/**
 * Verifica se le impostazioni email sono configurate
 * @returns {boolean} - true se le impostazioni sono configurate
 */
function isEmailConfigured() {
  const requiredVars = [
    'SMTP_SERVER',
    'SMTP_PORT',
    'SMTP_USERNAME',
    'SMTP_PASSWORD',
    'EMAIL_SENDER',
    'EMAIL_ENABLED'
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    log(`Configurazione email incompleta. Variabili mancanti: ${missingVars.join(', ')}`, 'email');
    return false;
  }
  
  return process.env.EMAIL_ENABLED === 'true';
}

/**
 * Invia una notifica via email usando il servizio Python
 * 
 * @param {string} notificationType - Tipo di notifica ('shift', 'document', 'time_off')
 * @param {Object} data - Dati da inviare
 * @returns {Promise<boolean>} - Promise con esito dell'invio
 */
function sendEmailNotification(notificationType, data) {
  return new Promise((resolve, reject) => {
    if (!isEmailConfigured()) {
      log(`Email non configurata o disabilitata. Notifica simulata: ${notificationType}`, 'email');
      log(`Dati notifica: ${JSON.stringify(data)}`, 'email');
      return resolve(false);
    }
    
    const pythonScriptPath = path.join(__dirname, '..', 'email_service.py');
    
    // Verifica che lo script Python esista
    if (!fs.existsSync(pythonScriptPath)) {
      log(`Script Python non trovato: ${pythonScriptPath}`, 'email');
      return reject(new Error('Script Python per email non trovato'));
    }
    
    // Preparazione dei parametri per il processo Python
    const jsonData = JSON.stringify(data);
    
    // Avvio del processo Python
    const pythonProcess = spawn('python3', [pythonScriptPath, notificationType, jsonData]);
    
    let outputData = '';
    let errorData = '';
    
    // Raccolta output standard
    pythonProcess.stdout.on('data', (data) => {
      outputData += data.toString();
    });
    
    // Raccolta errori
    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString();
      log(`Errore nel processo Python: ${data}`, 'email');
    });
    
    // Gestione completamento processo
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        log(`Processo Python terminato con codice ${code}`, 'email');
        if (errorData) {
          return reject(new Error(`Errore nell'invio email: ${errorData}`));
        }
        return reject(new Error(`Processo Python terminato con codice ${code}`));
      }
      
      try {
        // Parsing della risposta JSON
        const result = JSON.parse(outputData);
        log(`Email inviata con successo: ${result.success}`, 'email');
        resolve(result.success);
      } catch (error) {
        log(`Errore nel parsing della risposta Python: ${error.message}`, 'email');
        log(`Output Python: ${outputData}`, 'email');
        reject(error);
      }
    });
    
    // Gestione errori di avvio del processo
    pythonProcess.on('error', (error) => {
      log(`Errore nell'avvio del processo Python: ${error.message}`, 'email');
      reject(error);
    });
  });
}

/**
 * Invia notifica per pubblicazione turni
 * 
 * @param {Object} user - Dati utente (id, name, email)
 * @param {Object} schedule - Dati schedule (id, startDate, endDate)
 * @param {Array} shifts - Array di turni assegnati all'utente
 * @returns {Promise<boolean>} - Promise con esito dell'invio
 */
async function sendShiftPublicationNotification(user, schedule, shifts) {
  try {
    log(`Invio notifica turni per utente ${user.id}`, 'email');
    return await sendEmailNotification('shift', { user, schedule, shifts });
  } catch (error) {
    log(`Errore nell'invio notifica turni: ${error.message}`, 'email');
    return false;
  }
}

/**
 * Invia notifica per caricamento documento
 * 
 * @param {Object} user - Dati utente (id, name, email)
 * @param {Object} document - Dati documento (id, type, period)
 * @returns {Promise<boolean>} - Promise con esito dell'invio
 */
async function sendDocumentNotification(user, document) {
  try {
    log(`Invio notifica documento per utente ${user.id}`, 'email');
    return await sendEmailNotification('document', { user, document });
  } catch (error) {
    log(`Errore nell'invio notifica documento: ${error.message}`, 'email');
    return false;
  }
}

/**
 * Invia notifica per aggiornamento stato richiesta ferie/permesso
 * 
 * @param {Object} user - Dati utente (id, name, email)
 * @param {Object} timeOff - Dati richiesta (id, type, startDate, endDate, status)
 * @returns {Promise<boolean>} - Promise con esito dell'invio
 */
async function sendTimeOffStatusNotification(user, timeOff) {
  try {
    log(`Invio notifica ferie/permesso per utente ${user.id}`, 'email');
    return await sendEmailNotification('time_off', { user, timeOff });
  } catch (error) {
    log(`Errore nell'invio notifica ferie/permesso: ${error.message}`, 'email');
    return false;
  }
}

module.exports = {
  sendShiftPublicationNotification,
  sendDocumentNotification,
  sendTimeOffStatusNotification,
  isEmailConfigured
};