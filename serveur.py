"""
Petit serveur local pour ouvrir des fichiers avec leur application native.
Lance par lancer_visio.bat - ecoute sur http://localhost:8765
"""

import http.server
import urllib.parse
import os
import sys
import subprocess

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

        elif parsed.path == '/open':
            file_path = params.get('path', [''])[0]
            if not file_path:
                self.wfile.write('ERREUR: chemin vide'.encode('utf-8'))
                return

            if not os.path.exists(file_path):
                self.wfile.write(('ERREUR: fichier introuvable: ' + file_path).encode('utf-8'))
                return

            try:
                os.startfile(file_path)
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
