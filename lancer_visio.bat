@echo off
title Visio - Serveur local
echo === Demarrage de Visio ===
echo.

:: Lancer le serveur Python (fenetre visible pour le debug, peut etre minimisee manuellement)
start "Serveur Visio" python "%~dp0serveur.py"

:: Attendre 1 seconde que le serveur demarre
timeout /t 1 /nobreak >nul

:: Ouvrir l'application dans le navigateur par defaut
start "" "%~dp0index.html"

echo Application lancee dans le navigateur.
echo Le serveur tourne en arriere-plan (icone dans la barre des taches).
echo.
