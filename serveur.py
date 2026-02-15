"""
Petit serveur local pour ouvrir des fichiers avec leur application native.
Lance par lancer_visio.bat - ecoute sur http://localhost:8765
"""

import http.server
import urllib.parse
import os
import sys
import subprocess
import ctypes
import threading

PORT = 8765

class FileHandler(http.server.BaseHTTPRequestHandler):

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)

        # Headers CORS pour autoriser les requetes depuis file:// et http://
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Type', 'text/plain; charset=utf-8')
        self.end_headers()

        if parsed.path == '/ping':
            self.wfile.write('OK'.encode('utf-8'))

        elif parsed.path == '/browse':
            # Ouvrir la boite de dialogue native Windows pour selectionner un fichier
            result = {'path': ''}
            def ask_file():
                import tkinter as tk
                from tkinter import filedialog
                root = tk.Tk()
                root.withdraw()
                root.attributes('-topmost', True)
                file_path = filedialog.askopenfilename(
                    parent=root,
                    title='S\u00e9lectionner un fichier'
                )
                root.destroy()
                result['path'] = file_path or ''

            # tkinter doit tourner dans un thread separe pour ne pas bloquer
            t = threading.Thread(target=ask_file)
            t.start()
            t.join()

            print('[DEBUG] Browse: [' + result['path'] + ']')
            self.wfile.write(result['path'].encode('utf-8'))

        elif parsed.path == '/open':
            file_path = params.get('path', [''])[0]
            if not file_path:
                self.wfile.write('ERREUR: chemin vide'.encode('utf-8'))
                return

            # Nettoyage du chemin: caracteres invisibles Unicode, guillemets, espaces
            file_path = file_path.strip().strip('"').strip("'").strip()
            # Supprimer les caracteres de direction Unicode ajoutes par Windows "Copier en tant que chemin"
            for ch in '\u202a\u202b\u202c\u202d\u202e\u200e\u200f\u200b\u200c\u200d\ufeff':
                file_path = file_path.replace(ch, '')
            file_path = file_path.replace('/', '\\')

            print('[DEBUG] Chemin recu: [' + file_path + ']')
            print('[DEBUG] Existe: ' + str(os.path.exists(file_path)))

            if not os.path.exists(file_path):
                self.wfile.write(('ERREUR: fichier introuvable: ' + file_path).encode('utf-8'))
                return

            try:
                # ShellExecuteW avec SW_SHOWNORMAL (1) pour ouvrir au premier plan
                result = ctypes.windll.shell32.ShellExecuteW(
                    None, 'open', file_path, None, None, 1
                )
                print('[DEBUG] ShellExecute result: ' + str(result))
                if result <= 32:
                    # Fallback avec subprocess si ShellExecute echoue
                    subprocess.Popen(['cmd', '/c', 'start', '', file_path], shell=False)
                    print('[DEBUG] Fallback subprocess lance')
                print('[DEBUG] Ouverture lancee: ' + file_path)
                self.wfile.write(('OK: ' + file_path).encode('utf-8'))
            except Exception as e:
                self.wfile.write(('ERREUR: ' + str(e)).encode('utf-8'))

        else:
            self.wfile.write('Serveur Visio actif. Endpoints: /ping, /open?path=...'.encode('utf-8'))

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.end_headers()

    def log_message(self, format, *args):
        print('[Serveur Visio] ' + (format % args))

if __name__ == '__main__':
    print('=== Serveur Visio ===')
    print('Ecoute sur http://localhost:' + str(PORT))
    print('Pour arreter: fermez cette fenetre ou Ctrl+C')
    print('')

    try:
        server = http.server.HTTPServer(('127.0.0.1', PORT), FileHandler)
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nServeur arrete.')
    except OSError as e:
        if 'Address already in use' in str(e) or '10048' in str(e):
            print('Le serveur tourne deja sur le port ' + str(PORT))
            input('Appuyez sur Entree pour fermer...')
        else:
            print('Erreur: ' + str(e))
            input('Appuyez sur Entree pour fermer...')
