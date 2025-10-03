Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "python C:\xampp\htdocs\dicom\php\remote_cloud_sync.py", 0, False
Set WshShell = Nothing
