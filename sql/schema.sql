-- SQL Schema for PACS Integration
-- Run this with: mysql -u root -p dicom < sql/schema.sql

-- Drop existing tables (be careful in production!)
DROP TABLE IF EXISTS study_access_log;
DROP TABLE IF EXISTS cached_series;
DROP TABLE IF EXISTS cached_studies;
DROP TABLE IF EXISTS cached_patients;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;

-- Users table
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    role ENUM('admin', 'radiologist', 'referring_doctor') DEFAULT 'referring_doctor',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    INDEX idx_username (username),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sessions table
CREATE TABLE sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    session_token VARCHAR(64) UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (session_token),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cached patients table (from Orthanc)
CREATE TABLE cached_patients (
    id INT PRIMARY KEY AUTO_INCREMENT,
    orthanc_id VARCHAR(255) UNIQUE NOT NULL,
    patient_id VARCHAR(64),
    patient_name VARCHAR(255),
    patient_birth_date DATE,
    patient_sex CHAR(1),
    studies_count INT DEFAULT 0,
    last_study_date DATE,
    last_cached TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_patient_id (patient_id),
    INDEX idx_patient_name (patient_name),
    INDEX idx_birth_date (patient_birth_date),
    FULLTEXT idx_name_search (patient_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cached studies table
CREATE TABLE cached_studies (
    id INT PRIMARY KEY AUTO_INCREMENT,
    orthanc_id VARCHAR(255) UNIQUE NOT NULL,
    patient_cache_id INT NOT NULL,
    patient_id VARCHAR(64),
    study_instance_uid VARCHAR(255),
    study_date DATE,
    study_time TIME,
    study_description VARCHAR(255),
    modality VARCHAR(16),
    accession_number VARCHAR(64),
    series_count INT DEFAULT 0,
    instances_count INT DEFAULT 0,
    last_cached TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_cache_id) REFERENCES cached_patients(id) ON DELETE CASCADE,
    INDEX idx_patient_id (patient_id),
    INDEX idx_study_uid (study_instance_uid),
    INDEX idx_study_date (study_date),
    INDEX idx_accession (accession_number),
    INDEX idx_modality (modality)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cached series table
CREATE TABLE cached_series (
    id INT PRIMARY KEY AUTO_INCREMENT,
    orthanc_id VARCHAR(255) UNIQUE NOT NULL,
    study_cache_id INT NOT NULL,
    series_instance_uid VARCHAR(255),
    series_number INT,
    series_description VARCHAR(255),
    modality VARCHAR(16),
    instances_count INT DEFAULT 0,
    last_cached TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (study_cache_id) REFERENCES cached_studies(id) ON DELETE CASCADE,
    INDEX idx_series_uid (series_instance_uid),
    INDEX idx_series_number (series_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Study access log
CREATE TABLE study_access_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    study_orthanc_id VARCHAR(255) NOT NULL,
    patient_id VARCHAR(64),
    study_instance_uid VARCHAR(255),
    access_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_access (user_id, access_time),
    INDEX idx_study_access (study_orthanc_id, access_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default admin user (password: admin123)
INSERT INTO users (username, password_hash, full_name, email, role) VALUES 
('admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System Administrator', 'admin@hospital.com', 'admin');

-- Insert test users for demo
INSERT INTO users (username, password_hash, full_name, email, role) VALUES 
('dr.smith', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Dr. John Smith', 'jsmith@hospital.com', 'radiologist'),
('dr.jones', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Dr. Sarah Jones', 'sjones@hospital.com', 'referring_doctor');
