import requests
import json
import time
import mysql.connector
from datetime import datetime

# Configuration
REMOTE_API_URL = "https://e-connect.in/dicom/api/remote_sync_receiver.php"
API_KEY = "Prasham123$"  # Must match server
SYNC_INTERVAL = 300  # 5 minutes (in seconds)

# Database connection
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '',  # Your MySQL password
    'database': 'dicom'
}

def log(message):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {message}")

def get_database_data():
    """Fetch all patients and studies from local database"""
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor(dictionary=True)
        
        # Get patients
        cursor.execute("SELECT * FROM cached_patients")
        patients = cursor.fetchall()
        
        # Convert all values to JSON-serializable types
        for patient in patients:
            for key, value in patient.items():
                if value is None:
                    patient[key] = None
                elif hasattr(value, 'isoformat'):  # datetime, date, time objects
                    patient[key] = value.isoformat()
                elif isinstance(value, bytes):
                    patient[key] = value.decode('utf-8', errors='ignore')
                else:
                    patient[key] = str(value) if not isinstance(value, (int, float, str, bool)) else value
        
        # Get studies
        cursor.execute("SELECT * FROM cached_studies")
        studies = cursor.fetchall()
        
        # Convert all values to JSON-serializable types
        for study in studies:
            for key, value in study.items():
                if value is None:
                    study[key] = None
                elif hasattr(value, 'isoformat'):  # datetime, date, time objects
                    study[key] = value.isoformat()
                elif isinstance(value, bytes):
                    study[key] = value.decode('utf-8', errors='ignore')
                else:
                    study[key] = str(value) if not isinstance(value, (int, float, str, bool)) else value
        
        cursor.close()
        conn.close()
        
        return patients, studies
        
    except Exception as e:
        log(f"Database error: {str(e)}")
        return [], []

def sync_to_remote():
    """Send data to remote server"""
    try:
        patients, studies = get_database_data()
        
        if not patients and not studies:
            log("No data to sync")
            return True
        
        data = {
            'patients': patients,
            'studies': studies
        }
        
        log(f"Syncing {len(patients)} patients and {len(studies)} studies...")
        
        headers = {
            'Content-Type': 'application/json',
            'X-API-KEY': API_KEY
        }
        
        response = requests.post(
            REMOTE_API_URL,
            json=data,
            headers=headers,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            log(f"✓ Sync successful: {result['patients_synced']} patients, {result['studies_synced']} studies")
            return True
        else:
            log(f"✗ Sync failed: HTTP {response.status_code}")
            log(f"Response: {response.text}")
            return False
            
    except Exception as e:
        log(f"✗ Sync error: {str(e)}")
        return False

def main():
    log("=" * 60)
    log("Remote Cloud Sync Service")
    log("=" * 60)
    log(f"Remote Server: {REMOTE_API_URL}")
    log(f"Sync Interval: {SYNC_INTERVAL} seconds")
    log("Press Ctrl+C to stop")
    log("=" * 60)
    
    # Initial sync
    log("Running initial sync...")
    sync_to_remote()
    
    try:
        while True:
            time.sleep(SYNC_INTERVAL)
            log("Running scheduled sync...")
            sync_to_remote()
            
    except KeyboardInterrupt:
        log("")
        log("Stopping sync service...")
        log("Goodbye!")

if __name__ == "__main__":
    main()
