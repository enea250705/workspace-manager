import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
import os
import logging
from typing import List, Dict, Optional, Any
import json

# Configurazione del logger
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Configurazione server SMTP
SMTP_SERVER = os.environ.get('SMTP_SERVER', 'smtp.gmail.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', 587))
SMTP_USERNAME = os.environ.get('SMTP_USERNAME', '')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
EMAIL_SENDER = os.environ.get('EMAIL_SENDER', '')
EMAIL_ENABLED = os.environ.get('EMAIL_ENABLED', 'false').lower() == 'true'

class EmailService:
    @staticmethod
    def send_email(
        to_email: str,
        subject: str,
        html_content: str,
        text_content: str = None,
        attachments: List[Dict[str, Any]] = None
    ) -> bool:
        """
        Invia un'email usando il server SMTP configurato.
        
        Args:
            to_email: Indirizzo email del destinatario
            subject: Oggetto dell'email
            html_content: Contenuto HTML dell'email
            text_content: Contenuto testuale alternativo
            attachments: Lista di dizionari con chiavi 'filename', 'content_type' e 'data' (bytes)
            
        Returns:
            bool: True se l'email è stata inviata con successo, False altrimenti
        """
        if not EMAIL_ENABLED:
            logger.warning(f"Email service is disabled. Would have sent email to {to_email} with subject: {subject}")
            return False

        if not all([SMTP_SERVER, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, EMAIL_SENDER]):
            logger.error("Configurazione SMTP incompleta. Impossibile inviare email.")
            return False

        try:
            # Creazione del messaggio
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = EMAIL_SENDER
            message["To"] = to_email
            
            # Aggiunta del contenuto testuale (opzionale)
            if text_content:
                message.attach(MIMEText(text_content, "plain"))
            
            # Aggiunta del contenuto HTML (principale)
            message.attach(MIMEText(html_content, "html"))
            
            # Aggiunta di eventuali allegati
            if attachments:
                for attachment in attachments:
                    part = MIMEApplication(attachment['data'])
                    part.add_header(
                        "Content-Disposition", 
                        f"attachment; filename={attachment['filename']}"
                    )
                    message.attach(part)
            
            # Invio dell'email
            context = ssl.create_default_context()
            with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
                server.starttls(context=context)
                server.login(SMTP_USERNAME, SMTP_PASSWORD)
                server.sendmail(EMAIL_SENDER, to_email, message.as_string())
                
            logger.info(f"Email inviata con successo a {to_email}")
            return True
        
        except Exception as e:
            logger.error(f"Errore nell'invio dell'email a {to_email}: {str(e)}")
            return False

    @staticmethod
    def send_shift_publication_notification(user_data: Dict[str, Any], schedule_data: Dict[str, Any], shifts: List[Dict[str, Any]]) -> bool:
        """
        Invia una notifica email quando viene pubblicato un nuovo turno.
        
        Args:
            user_data: Dati dell'utente (deve includere almeno email e nome)
            schedule_data: Dati dello schedule (inizio/fine, ecc.)
            shifts: Lista dei turni assegnati all'utente
            
        Returns:
            bool: True se l'email è stata inviata con successo, False altrimenti
        """
        try:
            subject = "Nuovi turni pubblicati"
            
            # Generazione tabella HTML dei turni
            shifts_table = "<table border='1' cellpadding='5' cellspacing='0' style='border-collapse: collapse;'>"
            shifts_table += "<tr style='background-color: #f0f0f0;'><th>Giorno</th><th>Orario Inizio</th><th>Orario Fine</th><th>Tipo</th></tr>"
            
            for shift in shifts:
                start_time = shift.get('startTime', 'N/A')
                end_time = shift.get('endTime', 'N/A')
                day = shift.get('day', 'N/A')
                shift_type = shift.get('type', 'lavoro')
                
                type_color = {
                    'work': '#e0ffe0',  # verde chiaro
                    'vacation': '#e0e0ff',  # blu chiaro
                    'permission': '#fff0e0',  # arancione chiaro
                    'sickness': '#ffe0e0',  # rosso chiaro
                }.get(shift_type, '#ffffff')
                
                shifts_table += f"<tr style='background-color: {type_color};'>"
                shifts_table += f"<td>{day}</td><td>{start_time}</td><td>{end_time}</td>"
                shifts_table += f"<td>{shift_type}</td></tr>"
            
            shifts_table += "</table>"
            
            # Costruzione del corpo HTML
            start_date = schedule_data.get('startDate', 'N/A')
            end_date = schedule_data.get('endDate', 'N/A')
            
            html_content = f"""
            <html>
            <head>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    h1 {{ color: #2c3e50; border-bottom: 1px solid #eee; padding-bottom: 10px; }}
                    .footer {{ margin-top: 30px; font-size: 12px; color: #777; text-align: center; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>Nuovi Turni Pubblicati</h1>
                    <p>Gentile {user_data.get('name', 'Utente')},</p>
                    <p>Sono stati pubblicati i nuovi turni per il periodo <strong>{start_date}</strong> - <strong>{end_date}</strong>.</p>
                    <p>Ecco il riepilogo dei tuoi turni:</p>
                    {shifts_table}
                    <p>Puoi visualizzare i dettagli completi accedendo alla piattaforma.</p>
                    <div class="footer">
                        <p>Questo è un messaggio automatico, si prega di non rispondere.</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            # Versione testuale
            text_content = f"""
            Nuovi Turni Pubblicati
            
            Gentile {user_data.get('name', 'Utente')},
            
            Sono stati pubblicati i nuovi turni per il periodo {start_date} - {end_date}.
            
            Accedi alla piattaforma per visualizzare i dettagli.
            
            Questo è un messaggio automatico, si prega di non rispondere.
            """
            
            return EmailService.send_email(
                to_email=user_data.get('email', ''),
                subject=subject,
                html_content=html_content,
                text_content=text_content
            )
            
        except Exception as e:
            logger.error(f"Errore nell'invio della notifica turni: {str(e)}")
            return False

    @staticmethod
    def send_document_notification(user_data: Dict[str, Any], document_data: Dict[str, Any]) -> bool:
        """
        Invia una notifica email quando viene caricato un nuovo documento per l'utente.
        
        Args:
            user_data: Dati dell'utente (deve includere almeno email e nome)
            document_data: Dati del documento caricato
            
        Returns:
            bool: True se l'email è stata inviata con successo, False altrimenti
        """
        try:
            document_type = document_data.get('type', 'documento')
            document_period = document_data.get('period', '')
            
            # Mappatura dei tipi di documento in italiano
            document_type_mapping = {
                'payslip': 'Busta Paga',
                'cud': 'Certificazione Unica (CUD)',
                'contract': 'Contratto di Lavoro',
                'other': 'Documento'
            }
            
            italian_doc_type = document_type_mapping.get(document_type, 'Documento')
            
            subject = f"Nuovo {italian_doc_type} disponibile"
            
            # Costruzione del corpo HTML
            html_content = f"""
            <html>
            <head>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    h1 {{ color: #2c3e50; border-bottom: 1px solid #eee; padding-bottom: 10px; }}
                    .highlight {{ color: #e74c3c; font-weight: bold; }}
                    .footer {{ margin-top: 30px; font-size: 12px; color: #777; text-align: center; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>Nuovo {italian_doc_type} Disponibile</h1>
                    <p>Gentile {user_data.get('name', 'Utente')},</p>
                    <p>È stato caricato un nuovo {italian_doc_type.lower()} nel tuo account."""
            
            if document_period:
                html_content += f"""</p>
                    <p>Periodo di riferimento: <span class="highlight">{document_period}</span>"""
            
            html_content += f"""</p>
                    <p>Puoi visualizzare e scaricare il documento accedendo alla sezione "Documenti" della piattaforma.</p>
                    <div class="footer">
                        <p>Questo è un messaggio automatico, si prega di non rispondere.</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            # Versione testuale
            text_content = f"""
            Nuovo {italian_doc_type} Disponibile
            
            Gentile {user_data.get('name', 'Utente')},
            
            È stato caricato un nuovo {italian_doc_type.lower()} nel tuo account.
            """
            
            if document_period:
                text_content += f"""
            Periodo di riferimento: {document_period}
            """
            
            text_content += f"""
            Puoi visualizzare e scaricare il documento accedendo alla sezione "Documenti" della piattaforma.
            
            Questo è un messaggio automatico, si prega di non rispondere.
            """
            
            return EmailService.send_email(
                to_email=user_data.get('email', ''),
                subject=subject,
                html_content=html_content,
                text_content=text_content
            )
            
        except Exception as e:
            logger.error(f"Errore nell'invio della notifica documento: {str(e)}")
            return False

    @staticmethod
    def send_time_off_status_notification(user_data: Dict[str, Any], time_off_data: Dict[str, Any]) -> bool:
        """
        Invia una notifica email quando una richiesta di ferie/permesso viene approvata o rifiutata.
        
        Args:
            user_data: Dati dell'utente (deve includere almeno email e nome)
            time_off_data: Dati della richiesta di ferie/permesso
            
        Returns:
            bool: True se l'email è stata inviata con successo, False altrimenti
        """
        try:
            status = time_off_data.get('status', 'pending')
            time_off_type = time_off_data.get('type', 'vacation')
            start_date = time_off_data.get('startDate', 'N/A')
            end_date = time_off_data.get('endDate', 'N/A')
            
            # Mappatura dei tipi in italiano
            time_off_type_mapping = {
                'vacation': 'Ferie',
                'permission': 'Permesso',
                'sickness': 'Malattia'
            }
            
            status_mapping = {
                'approved': 'approvata',
                'rejected': 'rifiutata',
                'pending': 'in attesa'
            }
            
            italian_type = time_off_type_mapping.get(time_off_type, 'Assenza')
            italian_status = status_mapping.get(status, 'aggiornata')
            
            if status == 'approved':
                subject = f"Richiesta di {italian_type} approvata"
                status_color = "#28a745"  # verde
            elif status == 'rejected':
                subject = f"Richiesta di {italian_type} rifiutata"
                status_color = "#dc3545"  # rosso
            else:
                subject = f"Aggiornamento richiesta di {italian_type}"
                status_color = "#ffc107"  # giallo
            
            # Costruzione del corpo HTML
            html_content = f"""
            <html>
            <head>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    h1 {{ color: #2c3e50; border-bottom: 1px solid #eee; padding-bottom: 10px; }}
                    .status {{ color: {status_color}; font-weight: bold; }}
                    .details {{ background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }}
                    .footer {{ margin-top: 30px; font-size: 12px; color: #777; text-align: center; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>Richiesta di {italian_type}</h1>
                    <p>Gentile {user_data.get('name', 'Utente')},</p>
                    <p>La tua richiesta di {italian_type.lower()} è stata <span class="status">{italian_status}</span>.</p>
                    
                    <div class="details">
                        <p><strong>Periodo:</strong> {start_date} - {end_date}</p>
                        <p><strong>Tipo:</strong> {italian_type}</p>
                        <p><strong>Status:</strong> <span class="status">{italian_status.capitalize()}</span></p>
                    </div>
                    """
                    
            # Aggiunta motivazione rifiuto se presente
            if status == 'rejected' and time_off_data.get('rejectionReason'):
                html_content += f"""
                    <p><strong>Motivazione del rifiuto:</strong> {time_off_data.get('rejectionReason')}</p>
                    """
                    
            html_content += f"""
                    <p>Puoi visualizzare i dettagli completi accedendo alla sezione "Ferie e Permessi" della piattaforma.</p>
                    
                    <div class="footer">
                        <p>Questo è un messaggio automatico, si prega di non rispondere.</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            # Versione testuale
            text_content = f"""
            Richiesta di {italian_type}
            
            Gentile {user_data.get('name', 'Utente')},
            
            La tua richiesta di {italian_type.lower()} è stata {italian_status}.
            
            Periodo: {start_date} - {end_date}
            Tipo: {italian_type}
            Status: {italian_status.capitalize()}
            """
            
            # Aggiunta motivazione rifiuto se presente
            if status == 'rejected' and time_off_data.get('rejectionReason'):
                text_content += f"""
            Motivazione del rifiuto: {time_off_data.get('rejectionReason')}
            """
                
            text_content += f"""
            Puoi visualizzare i dettagli completi accedendo alla sezione "Ferie e Permessi" della piattaforma.
            
            Questo è un messaggio automatico, si prega di non rispondere.
            """
            
            return EmailService.send_email(
                to_email=user_data.get('email', ''),
                subject=subject,
                html_content=html_content,
                text_content=text_content
            )
            
        except Exception as e:
            logger.error(f"Errore nell'invio della notifica stato ferie: {str(e)}")
            return False

# Funzione di comodo per chiamate da JavaScript
def send_email_notification(notification_type, data_json):
    """
    Wrapper per chiamate da JavaScript (tramite child_process)
    
    Args:
        notification_type: Tipo di notifica ('shift', 'document', 'time_off')
        data_json: Dati in formato JSON 
        
    Returns:
        None (stampa il risultato)
    """
    try:
        data = json.loads(data_json)
        
        if notification_type == 'shift':
            result = EmailService.send_shift_publication_notification(
                data.get('user', {}), 
                data.get('schedule', {}), 
                data.get('shifts', [])
            )
        elif notification_type == 'document':
            result = EmailService.send_document_notification(
                data.get('user', {}),
                data.get('document', {})
            )
        elif notification_type == 'time_off':
            result = EmailService.send_time_off_status_notification(
                data.get('user', {}),
                data.get('timeOff', {})
            )
        else:
            logger.error(f"Tipo di notifica non riconosciuto: {notification_type}")
            result = False
            
        print(json.dumps({"success": result}))
        
    except Exception as e:
        logger.error(f"Errore nell'elaborazione della notifica: {str(e)}")
        print(json.dumps({"success": False, "error": str(e)}))

# Esecuzione diretta come script
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) >= 3:
        notification_type = sys.argv[1]
        data_json = sys.argv[2]
        send_email_notification(notification_type, data_json)
    else:
        print(json.dumps({"success": False, "error": "Parametri insufficienti. Utilizzo: python email_service.py <notification_type> <data_json>"}))