"""
Petit serveur local pour ouvrir des fichiers avec leur application native
et exporter des donnees vers des fichiers ODS.
Lance par lancer_visio.bat - ecoute sur http://localhost:8765
"""

import http.server
import urllib.parse
import os
import sys
import subprocess
import ctypes
import threading
import json
import zipfile
import shutil
import copy
import io
import xml.etree.ElementTree as ET

PORT = 8765

# --- ODS Helper ---

# Namespaces OpenDocument
ODS_NS = {
    'office': 'urn:oasis:names:tc:opendocument:xmlns:office:1.0',
    'table': 'urn:oasis:names:tc:opendocument:xmlns:table:1.0',
    'text': 'urn:oasis:names:tc:opendocument:xmlns:text:1.0',
    'style': 'urn:oasis:names:tc:opendocument:xmlns:style:1.0',
    'fo': 'urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0',
    'number': 'urn:oasis:names:tc:opendocument:xmlns:datastyle:1.0',
    'svg': 'urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0',
    'draw': 'urn:oasis:names:tc:opendocument:xmlns:drawing:1.0',
    'chart': 'urn:oasis:names:tc:opendocument:xmlns:chart:1.0',
    'dr3d': 'urn:oasis:names:tc:opendocument:xmlns:dr3d:1.0',
    'form': 'urn:oasis:names:tc:opendocument:xmlns:form:1.0',
    'script': 'urn:oasis:names:tc:opendocument:xmlns:script:1.0',
    'meta': 'urn:oasis:names:tc:opendocument:xmlns:meta:1.0',
    'xlink': 'http://www.w3.org/1999/xlink',
    'dc': 'http://purl.org/dc/elements/1.1/',
    'ooo': 'http://openoffice.org/2004/office',
    'ooow': 'http://openoffice.org/2004/writer',
    'oooc': 'http://openoffice.org/2004/calc',
    'dom': 'http://www.w3.org/2001/xml-events',
    'calcext': 'urn:org:documentfoundation:names:experimental:calc:xmlns:calcext:1.0',
    'loext': 'urn:org:documentfoundation:names:experimental:office:xmlns:loext:1.0',
    'tableooo': 'http://openoffice.org/2009/table',
    'drawooo': 'http://openoffice.org/2010/draw',
    'css3t': 'http://www.w3.org/TR/css3-text/',
    'of': 'urn:oasis:names:tc:opendocument:xmlns:of:1.2',
    'xhtml': 'http://www.w3.org/1999/xhtml',
    'grddl': 'http://www.w3.org/2003/g/data-view#',
    'field': 'urn:openoffice:names:experimental:ooo-ms-interop:xmlns:field:1.0',
}

# Enregistrer les namespaces pour eviter les prefixes ns0, ns1...
for _prefix, _uri in ODS_NS.items():
    ET.register_namespace(_prefix, _uri)

TABLE = '{%s}' % ODS_NS['table']
TEXT = '{%s}' % ODS_NS['text']
OFFICE = '{%s}' % ODS_NS['office']


def ods_get_cell_text(cell):
    """Recuperer le texte d'une cellule ODS"""
    for p in cell.findall(TEXT + 'p'):
        if p.text:
            return p.text.strip()
    return ''


def ods_set_cell_text(cell, text):
    """Ecrire du texte dans une cellule ODS"""
    cell.set(OFFICE + 'value-type', 'string')
    # Retirer l'attribut repeated s'il existe
    rep_attr = TABLE + 'number-columns-repeated'
    if rep_attr in cell.attrib:
        del cell.attrib[rep_attr]
    # Vider les paragraphes existants
    for p in list(cell.findall(TEXT + 'p')):
        cell.remove(p)
    # Ajouter le nouveau texte
    p = ET.SubElement(cell, TEXT + 'p')
    p.text = str(text)


def ods_expand_cells(row):
    """Developper les cellules repetees d'une ligne en liste de cellules individuelles"""
    cells = []
    for child in list(row):
        if child.tag != TABLE + 'table-cell' and child.tag != TABLE + 'covered-table-cell':
            continue
        rep = child.get(TABLE + 'number-columns-repeated')
        if rep:
            count = int(rep)
            # Garder la premiere, dupliquer les suivantes
            del child.attrib[TABLE + 'number-columns-repeated']
            cells.append(child)
            for i in range(1, min(count, 50)):
                cells.append(copy.deepcopy(child))
        else:
            cells.append(child)
    return cells


def ods_rebuild_row(row, cells):
    """Reconstruire une ligne a partir d'une liste de cellules"""
    # Supprimer tous les enfants cellule
    for child in list(row):
        if child.tag == TABLE + 'table-cell' or child.tag == TABLE + 'covered-table-cell':
            row.remove(child)
    # Ajouter les nouvelles cellules
    for cell in cells:
        row.append(cell)


def ods_create_text_cell(text):
    """Creer une nouvelle cellule texte"""
    cell = ET.Element(TABLE + 'table-cell')
    cell.set(OFFICE + 'value-type', 'string')
    p = ET.SubElement(cell, TEXT + 'p')
    p.text = str(text)
    return cell


def ods_create_empty_cell():
    """Creer une cellule vide"""
    return ET.Element(TABLE + 'table-cell')


def update_ods_file(file_path, columns_data):
    """
    Met a jour un fichier ODS avec les donnees fournies.
    columns_data = {'Projekt Nr.': '12345', 'Projekt Nennung': 'Mon Projet', ...}
    La colonne 'Projekt Nr.' sert de cle unique.
    """
    projekt_nr = columns_data.get('Projekt Nr.', '').strip()
    if not projekt_nr:
        return 'ERREUR: Projekt Nr. est vide'

    if not os.path.exists(file_path):
        return 'ERREUR: fichier ODS introuvable: ' + file_path

    # Lire le fichier ODS (c'est un ZIP)
    try:
        with zipfile.ZipFile(file_path, 'r') as zf:
            content_xml = zf.read('content.xml')
            all_files = {}
            for name in zf.namelist():
                all_files[name] = zf.read(name)
    except Exception as e:
        return 'ERREUR: impossible de lire le fichier ODS: ' + str(e)

    # Parser le XML
    try:
        tree = ET.ElementTree(ET.fromstring(content_xml))
        root = tree.getroot()
    except Exception as e:
        return 'ERREUR: XML invalide dans le fichier ODS: ' + str(e)

    # Trouver la premiere table
    table = root.find('.//' + TABLE + 'table')
    if table is None:
        return 'ERREUR: aucune table trouvee dans le fichier ODS'

    # Recuperer toutes les lignes (y compris celles dans table-header-rows)
    rows = table.findall('.//' + TABLE + 'table-row')
    if len(rows) < 1:
        return 'ERREUR: le tableau est vide (pas de ligne d\'en-tete)'

    # Lire les en-tetes (premiere ligne)
    header_row = rows[0]
    header_cells = ods_expand_cells(header_row)
    headers = [ods_get_cell_text(c) for c in header_cells]

    print('[ODS] En-tetes trouves: ' + str(headers))

    # Trouver l'index de la colonne "Projekt Nr."
    try:
        key_col_idx = headers.index('Projekt Nr.')
    except ValueError:
        return 'ERREUR: colonne "Projekt Nr." introuvable dans les en-tetes'

    # Reconstruire la ligne d'en-tete (au cas ou on a expanse des cellules)
    ods_rebuild_row(header_row, header_cells)

    # Construire le mapping en-tete -> index
    header_map = {}
    for i, h in enumerate(headers):
        if h:
            header_map[h] = i

    print('[ODS] Mapping colonnes: ' + str(header_map))

    # Chercher la ligne avec le bon Projekt Nr.
    target_row = None
    target_row_idx = -1
    for i in range(1, len(rows)):
        row = rows[i]
        cells = ods_expand_cells(row)
        if len(cells) > key_col_idx:
            cell_text = ods_get_cell_text(cells[key_col_idx])
            if cell_text == projekt_nr:
                target_row = row
                target_row_idx = i
                print('[ODS] Ligne trouvee pour Projekt Nr. ' + projekt_nr + ' (ligne ' + str(i + 1) + ')')
                break

    num_cols = len(headers)

    if target_row is not None:
        # Mettre a jour la ligne existante
        cells = ods_expand_cells(target_row)
        # Etendre si necessaire
        while len(cells) < num_cols:
            cells.append(ods_create_empty_cell())

        for col_name, value in columns_data.items():
            if col_name in header_map:
                idx = header_map[col_name]
                if idx < len(cells):
                    ods_set_cell_text(cells[idx], value)

        ods_rebuild_row(target_row, cells)
    else:
        # Creer une nouvelle ligne
        print('[ODS] Nouvelle ligne pour Projekt Nr. ' + projekt_nr)
        new_row = ET.Element(TABLE + 'table-row')
        for i in range(num_cols):
            col_name = headers[i] if i < len(headers) else ''
            if col_name in columns_data:
                new_row.append(ods_create_text_cell(columns_data[col_name]))
            else:
                new_row.append(ods_create_empty_cell())
        # Inserer apres la derniere ligne existante (pas dans table-header-rows)
        # Chercher les lignes directes de la table ou ajouter a la fin
        direct_rows = table.findall(TABLE + 'table-row')
        if direct_rows:
            # Inserer apres la derniere ligne directe
            last_row = direct_rows[-1]
            children = list(table)
            idx = children.index(last_row)
            table.insert(idx + 1, new_row)
        else:
            table.append(new_row)

    # Serialiser le XML modifie
    new_content = ET.tostring(root, encoding='unicode', xml_declaration=True)
    # Ajouter l'encoding UTF-8 dans la declaration
    if not new_content.startswith('<?xml'):
        new_content = '<?xml version="1.0" encoding="UTF-8"?>' + new_content

    # Reecrire le fichier ODS
    try:
        # Creer une copie de sauvegarde
        backup_path = file_path + '.bak'
        shutil.copy2(file_path, backup_path)

        # Ecrire le nouveau fichier
        with zipfile.ZipFile(file_path, 'w', zipfile.ZIP_DEFLATED) as zf:
            for name, data in all_files.items():
                if name == 'content.xml':
                    zf.writestr(name, new_content.encode('utf-8'))
                else:
                    zf.writestr(name, data)

        print('[ODS] Fichier mis a jour: ' + file_path)
        return 'OK'
    except Exception as e:
        # Restaurer la sauvegarde
        if os.path.exists(backup_path):
            shutil.copy2(backup_path, file_path)
        return 'ERREUR: impossible d\'ecrire le fichier ODS: ' + str(e)


# --- Nettoyage chemin ---

def clean_path(raw_path):
    """Nettoyer un chemin Windows (guillemets, caracteres invisibles Unicode)"""
    path = raw_path.strip().strip('"').strip("'").strip()
    for ch in '\u202a\u202b\u202c\u202d\u202e\u200e\u200f\u200b\u200c\u200d\ufeff':
        path = path.replace(ch, '')
    path = path.replace('/', '\\')
    return path


# --- Serveur HTTP ---

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

            file_path = clean_path(file_path)

            print('[DEBUG] Chemin recu: [' + file_path + ']')
            print('[DEBUG] Existe: ' + str(os.path.exists(file_path)))

            if not os.path.exists(file_path):
                self.wfile.write(('ERREUR: fichier introuvable: ' + file_path).encode('utf-8'))
                return

            try:
                result = ctypes.windll.shell32.ShellExecuteW(
                    None, 'open', file_path, None, None, 1
                )
                print('[DEBUG] ShellExecute result: ' + str(result))
                if result <= 32:
                    subprocess.Popen(['cmd', '/c', 'start', '', file_path], shell=False)
                    print('[DEBUG] Fallback subprocess lance')
                print('[DEBUG] Ouverture lancee: ' + file_path)
                self.wfile.write(('OK: ' + file_path).encode('utf-8'))
            except Exception as e:
                self.wfile.write(('ERREUR: ' + str(e)).encode('utf-8'))

        else:
            self.wfile.write('Serveur Visio actif. Endpoints: /ping, /browse, /open, /export-ods'.encode('utf-8'))

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)

        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Type', 'text/plain; charset=utf-8')
        self.end_headers()

        if parsed.path == '/export-ods':
            # Lire le corps de la requete
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')

            try:
                data = json.loads(body)
            except Exception:
                self.wfile.write('ERREUR: JSON invalide'.encode('utf-8'))
                return

            ods_path = clean_path(data.get('odsPath', ''))
            columns = data.get('columns', {})

            if not ods_path:
                self.wfile.write('ERREUR: chemin ODS non specifie'.encode('utf-8'))
                return

            print('[ODS] Export vers: ' + ods_path)
            print('[ODS] Donnees: ' + str(columns))

            try:
                result = update_ods_file(ods_path, columns)
            except Exception as e:
                result = 'ERREUR: exception lors de l\'export: ' + str(e)
                print('[ODS] ' + result)
            self.wfile.write(result.encode('utf-8'))
        else:
            self.wfile.write('ERREUR: endpoint inconnu'.encode('utf-8'))

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
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
