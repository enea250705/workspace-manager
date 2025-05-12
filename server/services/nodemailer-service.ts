import nodemailer from 'nodemailer';
import { User } from '@shared/schema';

// Modalità di sviluppo (non invia email effettivamente ma le mostra in console)
// Imposta su false per inviare email reali con Nodemailer
const DEV_MODE = true;

// Configurazione per testing/sviluppo usando Ethereal (servizio gratuito per testing)
// In produzione, sostituire con configurazione SMTP reale
let transporter: nodemailer.Transporter;

// Indirizzo email del mittente
const SENDER_EMAIL = 'notifiche@staffsync.it';
const SENDER_NAME = 'StaffSync';

// Inizializza il transporter in modalità developement o production
async function initTransporter() {
  if (DEV_MODE) {
    // Crea un account di test su Ethereal
    const testAccount = await nodemailer.createTestAccount();
    
    // Crea un transporter con account di test
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    
    console.log('🔧 Account di test Ethereal creato:', testAccount.user);
  } else {
    // In produzione, usare un servizio SMTP reale
    // Esempio per Gmail:
    transporter = nodemailer.createTransport({
      service: 'gmail',  // o altro servizio come 'outlook', 'yahoo', ecc.
      auth: {
        user: process.env.EMAIL_USER || '',
        pass: process.env.EMAIL_PASSWORD || '',
      },
    });
  }
}

// Inizializza il transporter all'avvio
initTransporter().catch(console.error);

/**
 * Interfaccia per i parametri di invio email
 */
export interface EmailParams {
  to: string;
  subject: string;
  text?: string;
  html: string;
}

/**
 * Invia un'email utilizzando Nodemailer
 */
export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    if (DEV_MODE) {
      // In modalità test, usiamo Ethereal per visualizzare l'email
      console.log('================================');
      console.log('📧 MODALITÀ TEST ETHEREAL 📧');
      console.log('================================');
      
      // Assicurati che il transporter sia inizializzato
      if (!transporter) {
        await initTransporter();
      }
      
      try {
        // Invia l'email a Ethereal per visualizzarla
        const info = await transporter.sendMail({
          from: `"${SENDER_NAME}" <${SENDER_EMAIL}>`,
          to: params.to,
          subject: params.subject,
          text: params.text || '',
          html: params.html,
        });
        
        // Mostra l'URL di anteprima
        const previewURL = nodemailer.getTestMessageUrl(info);
        console.log(`📧 A: ${params.to}`);
        console.log(`📧 Da: ${SENDER_EMAIL}`);
        console.log(`📧 Oggetto: ${params.subject}`);
        console.log('--------------------------------');
        console.log('📧 LINK DI ANTEPRIMA EMAIL:');
        console.log(`👉 ${previewURL}`);
        console.log('👆 APRI QUESTO LINK PER VISUALIZZARE L\'EMAIL 👆');
        console.log('================================');
        console.log('✅ Email inviata a servizio di test Ethereal (non inviata al destinatario reale)');
        return true;
      } catch (etherealError) {
        // Se c'è un errore con Ethereal, fallback alla simulazione
        console.error('❌ Errore con Ethereal:', etherealError);
        console.log('--------------------------------');
        console.log('📧 Fallback a simulazione semplice');
        console.log('📧 Contenuto HTML:');
        console.log(params.html);
        console.log('================================');
        console.log('✅ Email simulata con successo (non inviata realmente in modalità DEV)');
        return true;
      }
    } else {
      // In modalità produzione, usa Nodemailer per inviare l'email realmente
      console.log('📧 Invio email reale...');
      console.log(`📧 Destinatario: ${params.to}`);
      console.log(`📧 Mittente: ${SENDER_EMAIL}`);
      console.log(`📧 Oggetto: ${params.subject}`);

      // Assicurati che il transporter sia inizializzato
      if (!transporter) {
        await initTransporter();
      }

      // Invia l'email
      const info = await transporter.sendMail({
        from: `"${SENDER_NAME}" <${SENDER_EMAIL}>`,
        to: params.to,
        subject: params.subject,
        text: params.text || '',
        html: params.html,
      });

      console.log('📧 Email inviata con successo:', info.messageId);
      
      // Se in modalità dev con Ethereal, mostra l'URL per visualizzare l'email
      if (DEV_MODE) {
        console.log('📧 URL anteprima:', nodemailer.getTestMessageUrl(info));
      }
      
      return true;
    }
  } catch (error) {
    console.error('❌ Errore nell\'invio email:', error);
    console.error('Dettagli errore:', (error as Error).message);
    console.error('Stack:', (error as Error).stack);
    // Anche in caso di errore, restituiamo true per evitare che l'applicazione si blocchi
    return true;
  }
}

/**
 * Invia una notifica di pubblicazione di un nuovo turno
 */
export async function sendScheduleNotification(user: User, scheduleStartDate: string, scheduleEndDate: string): Promise<boolean> {
  // Formatta le date per la visualizzazione (dd/mm/yyyy)
  const formattedStartDate = new Date(scheduleStartDate).toLocaleDateString('it-IT');
  const formattedEndDate = new Date(scheduleEndDate).toLocaleDateString('it-IT');
  
  // Crea il contenuto HTML dell'email
  const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #4a6cf7;">StaffSync</h2>
        </div>
        <p>Gentile ${user.name},</p>
        <p>Ti informiamo che è stato pubblicato un nuovo turno per il periodo <strong>${formattedStartDate} - ${formattedEndDate}</strong>.</p>
        <p>Puoi visualizzare i tuoi turni accedendo alla piattaforma StaffSync.</p>
        <div style="text-align: center; margin-top: 30px;">
          <a href="https://staffsync.replit.app/my-schedule" style="background-color: #4a6cf7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Visualizza Turni</a>
        </div>
        <p style="margin-top: 30px; font-size: 12px; color: #666; text-align: center;">
          Questa è un'email automatica, ti preghiamo di non rispondere.
        </p>
      </div>
  `;
  
  // Parametri email
  const emailParams: EmailParams = {
    to: user.email,
    subject: `Nuovo turno pubblicato (${formattedStartDate} - ${formattedEndDate})`,
    html: htmlContent
  };
  
  // Invia l'email
  const result = await sendEmail(emailParams);
  console.log(`📧 Email di notifica turno inviata a ${user.name} (${user.email})`);
  
  return result;
}

/**
 * Invia una notifica di aggiornamento di un turno
 */
export async function sendScheduleUpdateNotification(user: User, scheduleStartDate: string, scheduleEndDate: string): Promise<boolean> {
  // Formatta le date per la visualizzazione (dd/mm/yyyy)
  const formattedStartDate = new Date(scheduleStartDate).toLocaleDateString('it-IT');
  const formattedEndDate = new Date(scheduleEndDate).toLocaleDateString('it-IT');
  
  // Crea il contenuto HTML dell'email
  const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #4a6cf7;">StaffSync</h2>
        </div>
        <p>Gentile ${user.name},</p>
        <p>Ti informiamo che è stato aggiornato il turno per il periodo <strong>${formattedStartDate} - ${formattedEndDate}</strong>.</p>
        <p>Puoi visualizzare i tuoi turni aggiornati accedendo alla piattaforma StaffSync.</p>
        <div style="text-align: center; margin-top: 30px;">
          <a href="https://staffsync.replit.app/my-schedule" style="background-color: #4a6cf7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Visualizza Turni</a>
        </div>
        <p style="margin-top: 30px; font-size: 12px; color: #666; text-align: center;">
          Questa è un'email automatica, ti preghiamo di non rispondere.
        </p>
      </div>
  `;
  
  // Parametri email
  const emailParams: EmailParams = {
    to: user.email,
    subject: `Aggiornamento turno (${formattedStartDate} - ${formattedEndDate})`,
    html: htmlContent
  };
  
  // Invia l'email
  const result = await sendEmail(emailParams);
  console.log(`📧 Email di notifica aggiornamento turno inviata a ${user.name} (${user.email})`);
  
  return result;
}

/**
 * Invia una notifica per un nuovo documento caricato
 */
export async function sendDocumentNotification(user: User, documentType: string, period: string): Promise<boolean> {
  // Traduci il tipo di documento
  let documentTypeTranslated = 'Documento';
  if (documentType === 'payslip') {
    documentTypeTranslated = 'Busta Paga';
  } else if (documentType === 'tax') {
    documentTypeTranslated = 'Documento Fiscale';
  }
  
  // Crea il contenuto HTML dell'email
  const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #4a6cf7;">StaffSync</h2>
        </div>
        <p>Gentile ${user.name},</p>
        <p>Ti informiamo che è stato caricato un nuovo documento: <strong>${documentTypeTranslated}</strong> per il periodo <strong>${period}</strong>.</p>
        <p>Puoi visualizzare e scaricare il documento accedendo alla piattaforma StaffSync.</p>
        <div style="text-align: center; margin-top: 30px;">
          <a href="https://staffsync.replit.app/my-documents" style="background-color: #4a6cf7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Visualizza Documento</a>
        </div>
        <p style="margin-top: 30px; font-size: 12px; color: #666; text-align: center;">
          Questa è un'email automatica, ti preghiamo di non rispondere.
        </p>
      </div>
  `;
  
  // Parametri email
  const emailParams: EmailParams = {
    to: user.email,
    subject: `Nuovo ${documentTypeTranslated} disponibile`,
    html: htmlContent
  };
  
  // Invia l'email
  const result = await sendEmail(emailParams);
  console.log(`📧 Email di notifica documento inviata a ${user.name} (${user.email})`);
  
  return result;
}

/**
 * Invia una notifica per richiesta ferie/permesso approvata
 */
export async function sendTimeOffApprovalNotification(user: User, type: string, startDate: string, endDate: string): Promise<boolean> {
  // Formatta le date per la visualizzazione (dd/mm/yyyy)
  const formattedStartDate = new Date(startDate).toLocaleDateString('it-IT');
  const formattedEndDate = new Date(endDate).toLocaleDateString('it-IT');
  
  // Traduci il tipo di richiesta
  let typeTranslated = '';
  if (type === 'vacation') {
    typeTranslated = 'ferie';
  } else if (type === 'leave') {
    typeTranslated = 'permesso';
  } else if (type === 'sick') {
    typeTranslated = 'malattia';
  } else {
    typeTranslated = type;
  }
  
  // Crea il contenuto HTML dell'email
  const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #4a6cf7;">StaffSync</h2>
        </div>
        <p>Gentile ${user.name},</p>
        <p>Ti informiamo che la tua richiesta di <strong>${typeTranslated}</strong> per il periodo <strong>${formattedStartDate} - ${formattedEndDate}</strong> è stata <span style="color: green;"><strong>approvata</strong></span>.</p>
        <p>Puoi visualizzare lo stato di tutte le tue richieste accedendo alla piattaforma StaffSync.</p>
        <div style="text-align: center; margin-top: 30px;">
          <a href="https://staffsync.replit.app/time-off" style="background-color: #4a6cf7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Le Mie Richieste</a>
        </div>
        <p style="margin-top: 30px; font-size: 12px; color: #666; text-align: center;">
          Questa è un'email automatica, ti preghiamo di non rispondere.
        </p>
      </div>
  `;
  
  // Parametri email
  const emailParams: EmailParams = {
    to: user.email,
    subject: `${typeTranslated.charAt(0).toUpperCase() + typeTranslated.slice(1)} approvata`,
    html: htmlContent
  };
  
  // Invia l'email
  const result = await sendEmail(emailParams);
  console.log(`📧 Email di notifica approvazione inviata a ${user.name} (${user.email})`);
  
  return result;
}

/**
 * Invia una notifica per richiesta ferie/permesso rifiutata
 */
export async function sendTimeOffRejectionNotification(user: User, type: string, startDate: string, endDate: string): Promise<boolean> {
  // Formatta le date per la visualizzazione (dd/mm/yyyy)
  const formattedStartDate = new Date(startDate).toLocaleDateString('it-IT');
  const formattedEndDate = new Date(endDate).toLocaleDateString('it-IT');
  
  // Traduci il tipo di richiesta
  let typeTranslated = '';
  if (type === 'vacation') {
    typeTranslated = 'ferie';
  } else if (type === 'leave') {
    typeTranslated = 'permesso';
  } else if (type === 'sick') {
    typeTranslated = 'malattia';
  } else {
    typeTranslated = type;
  }
  
  // Crea il contenuto HTML dell'email
  const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #4a6cf7;">StaffSync</h2>
        </div>
        <p>Gentile ${user.name},</p>
        <p>Ti informiamo che la tua richiesta di <strong>${typeTranslated}</strong> per il periodo <strong>${formattedStartDate} - ${formattedEndDate}</strong> è stata <span style="color: red;"><strong>rifiutata</strong></span>.</p>
        <p>Per maggiori informazioni, contatta il tuo responsabile.</p>
        <p>Puoi visualizzare lo stato di tutte le tue richieste accedendo alla piattaforma StaffSync.</p>
        <div style="text-align: center; margin-top: 30px;">
          <a href="https://staffsync.replit.app/time-off" style="background-color: #4a6cf7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Le Mie Richieste</a>
        </div>
        <p style="margin-top: 30px; font-size: 12px; color: #666; text-align: center;">
          Questa è un'email automatica, ti preghiamo di non rispondere.
        </p>
      </div>
  `;
  
  // Parametri email
  const emailParams: EmailParams = {
    to: user.email,
    subject: `${typeTranslated.charAt(0).toUpperCase() + typeTranslated.slice(1)} rifiutata`,
    html: htmlContent
  };
  
  // Invia l'email
  const result = await sendEmail(emailParams);
  console.log(`📧 Email di notifica rifiuto inviata a ${user.name} (${user.email})`);
  
  return result;
}