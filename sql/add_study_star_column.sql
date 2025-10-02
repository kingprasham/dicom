-- Add is_starred column to cached_studies table if it doesn't exist

ALTER TABLE `cached_studies` 
ADD COLUMN IF NOT EXISTS `is_starred` TINYINT(1) DEFAULT 0 AFTER `orthanc_id`;

-- Add index for better performance
ALTER TABLE `cached_studies` 
ADD INDEX IF NOT EXISTS `idx_is_starred` (`is_starred`);
