-- Add medical reports table to existing schema
CREATE TABLE IF NOT EXISTS medical_reports (
    id INT PRIMARY KEY AUTO_INCREMENT,
    study_orthanc_id VARCHAR(255) NOT NULL,
    study_instance_uid VARCHAR(255),
    patient_id VARCHAR(64),
    patient_name VARCHAR(255),
    report_content LONGTEXT,
    report_file_path VARCHAR(500),
    template_key VARCHAR(100),
    reporting_physician VARCHAR(255),
    referring_physician VARCHAR(255),
    report_status ENUM('draft', 'preliminary', 'final', 'amended') DEFAULT 'draft',
    report_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    updated_by INT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_study_orthanc (study_orthanc_id),
    INDEX idx_study_uid (study_instance_uid),
    INDEX idx_patient_id (patient_id),
    INDEX idx_report_date (report_date),
    INDEX idx_status (report_status),
    FULLTEXT idx_report_content (report_content)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add prescriptions table
CREATE TABLE IF NOT EXISTS prescriptions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    study_orthanc_id VARCHAR(255) NOT NULL,
    patient_id VARCHAR(64),
    patient_name VARCHAR(255),
    prescribing_physician VARCHAR(255),
    prescription_content TEXT,
    medications JSON,
    instructions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_study_orthanc (study_orthanc_id),
    INDEX idx_patient_id (patient_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add study metadata table for additional info
CREATE TABLE IF NOT EXISTS study_metadata (
    id INT PRIMARY KEY AUTO_INCREMENT,
    study_orthanc_id VARCHAR(255) UNIQUE NOT NULL,
    study_instance_uid VARCHAR(255),
    performed_by VARCHAR(255),
    referring_physician VARCHAR(255),
    department VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_study_orthanc (study_orthanc_id),
    INDEX idx_study_uid (study_instance_uid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
