class FileManager {
    constructor() {
        this.supportsFileSystemAccess = ('showSaveFilePicker' in window);
        this.fileTypes = [{
            description: 'Fichier Visio Projet',
            accept: { 'application/json': ['.json'] }
        }];
    }

    async saveProject(project) {
        var json = JSON.stringify(project.toJSON(), null, 2);

        if (this.supportsFileSystemAccess) {
            return this._saveWithFileSystemAccess(project, json);
        } else {
            return this._saveWithDownload(project, json);
        }
    }

    async _saveWithFileSystemAccess(project, json) {
        try {
            if (project.fileHandle) {
                var writable = await project.fileHandle.createWritable();
                await writable.write(json);
                await writable.close();
            } else {
                var handle = await window.showSaveFilePicker({
                    suggestedName: project.name + '.json',
                    types: this.fileTypes
                });
                var writable2 = await handle.createWritable();
                await writable2.write(json);
                await writable2.close();
                project.fileHandle = handle;
                project.name = handle.name.replace('.json', '');
            }
            project.markSaved();
            return true;
        } catch (e) {
            if (e.name !== 'AbortError') {
                console.error('Erreur de sauvegarde:', e);
                alert('Erreur lors de la sauvegarde : ' + e.message);
            }
            return false;
        }
    }

    _saveWithDownload(project, json) {
        var blob = new Blob([json], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = project.name + '.json';
        a.click();
        URL.revokeObjectURL(url);
        project.markSaved();
        return true;
    }

    async openProject() {
        if (this.supportsFileSystemAccess) {
            return this._openWithFileSystemAccess();
        } else {
            return this._openWithFileInput();
        }
    }

    async _openWithFileSystemAccess() {
        try {
            var handles = await window.showOpenFilePicker({
                types: this.fileTypes,
                multiple: false
            });
            var handle = handles[0];
            var file = await handle.getFile();
            var text = await file.text();
            var data = JSON.parse(text);
            var project = Project.fromJSON(data);
            project.fileHandle = handle;
            project.name = handle.name.replace('.json', '');
            return project;
        } catch (e) {
            if (e.name !== 'AbortError') {
                console.error("Erreur d'ouverture:", e);
                alert("Erreur lors de l'ouverture : " + e.message);
            }
            return null;
        }
    }

    _openWithFileInput() {
        return new Promise(function (resolve) {
            var input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.addEventListener('change', async function (e) {
                var file = e.target.files[0];
                if (!file) { resolve(null); return; }
                try {
                    var text = await file.text();
                    var data = JSON.parse(text);
                    var project = Project.fromJSON(data);
                    project.name = file.name.replace('.json', '');
                    resolve(project);
                } catch (err) {
                    alert("Erreur lors de l'ouverture : " + err.message);
                    resolve(null);
                }
            });
            input.click();
        });
    }
}
