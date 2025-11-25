@echo off
echo Building Bible App...
pyinstaller --noconfirm --onefile --windowed --icon "samuel_icon.ico" --add-data "data;data" --hidden-import "customtkinter" --name "bible" "bible.py"
echo Build Complete!
pause
