@echo off
echo Starting automatic DICOM sync...
echo Press Ctrl+C to stop this window.

:loop
echo [%time%] Checking for new files...
php -f "C:\xampp\htdocs\dicom\php\scripts\manual_upload.php"
echo Waiting for 60 seconds before next check...
timeout /t 60 /nobreak
goto loop