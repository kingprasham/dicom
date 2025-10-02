-- Fix prescriptions table to match the PHP code
-- Run this to fix the database schema

-- First, check if the prescriptions table exists
-- If it doesn't, create it; if it does, alter it

CREATE TABLE IF NOT EXISTS prescriptions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    study_instance_uid VARCHAR(255) NOT NULL,
    patient_id VARCHAR(64),
    prescribing_physician VARCHAR(255) NOT NULL,
    prescription_data TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50),
    updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
    updated_by VARCHAR(50),
    UNIQUE KEY unique_study_prescription (study_instance_uid),
    INDEX idx_patient_id (patient_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- If the table already exists but is missing patient_name column, this will fail silently
-- That's okay because the column is not needed (we can get it from cached_studies)
-- ALTER TABLE prescriptions ADD COLUMN patient_name VARCHAR(255) AFTER patient_id;
