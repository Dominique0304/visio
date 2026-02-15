class ToolboxWindow {
    constructor(onSave) {
        this.isVisible = false;
        this.activeTab = 'email';
        this.onSave = onSave || function () {};
        this.tabs = [
            { id: 'email', label: 'Email' },
            { id: 'dokumente', label: 'Dokumente' },
            { id: 'status', label: 'Status' },
            { id: 'infoprojekt', label: 'Info Projekt' },
            { id: 'adresse', label: 'Adresse' },
            { id: 'kontakte', label: 'Kontakte' },
            { id: 'divers', label: 'Divers' },
            { id: 'kommentare', label: 'Kommentare' }
        ];

        // Champs du formulaire Info Projekt
        this.infoProjektFields = [
            { id: 'projektNennung', label: 'Projekt Nennung' },
            { id: 'projektNr', label: 'Projekt Nr.' },
            { id: 'sapBlockNr', label: 'SAP-Block Nr.' },
            { id: 'sapGehauseNr', label: 'SAP Geh\u00e4use Nr.' },
            { id: 'kundenProduktNr', label: 'Kunden Produkt Nr.' },
            { id: 'angebotNr', label: 'Angebot Nr.' }
        ];

        // Donnees des onglets
        this.tabData = {};
        var self = this;
        this.tabs.forEach(function (tab) {
            if (tab.id === 'infoprojekt') {
                self.tabData[tab.id] = {};
                self.infoProjektFields.forEach(function (field) {
                    self.tabData[tab.id][field.id] = '';
                });
            } else {
                self.tabData[tab.id] = '';
            }
        });
        this.todoText = '';
        // Charger le chemin ODS depuis localStorage pour ne pas le ressaisir
        this.odsPath = localStorage.getItem('visio_odsPath') || '';
        this._snapshot = null;

        this._buildWindow();
    }

    _buildWindow() {
        var self = this;

        // Conteneur principal
        this.windowEl = document.createElement('div');
        this.windowEl.className = 'toolbox-window';
        this.windowEl.style.display = 'none';

        // Barre de titre draggable
        this.titleBar = document.createElement('div');
        this.titleBar.className = 'toolbox-titlebar';

        var titleText = document.createElement('span');
        titleText.textContent = 'Bo\u00eete \u00e0 outils';
        this.titleBar.appendChild(titleText);

        var closeBtn = document.createElement('button');
        closeBtn.className = 'toolbox-close-btn';
        closeBtn.textContent = '\u00d7';
        closeBtn.addEventListener('click', function () {
            self.hide();
        });
        this.titleBar.appendChild(closeBtn);

        this.windowEl.appendChild(this.titleBar);

        // Barre d'onglets
        this.tabBar = document.createElement('div');
        this.tabBar.className = 'toolbox-tabbar';

        this.tabs.forEach(function (tab) {
            var tabBtn = document.createElement('button');
            tabBtn.className = 'toolbox-tab';
            tabBtn.dataset.tabId = tab.id;
            tabBtn.textContent = tab.label;
            tabBtn.addEventListener('click', function () {
                self._switchTab(tab.id);
            });
            self.tabBar.appendChild(tabBtn);
        });

        this.windowEl.appendChild(this.tabBar);

        // Zone de contenu des onglets
        this.contentArea = document.createElement('div');
        this.contentArea.className = 'toolbox-content';
        this.windowEl.appendChild(this.contentArea);

        // Separateur
        var separator1 = document.createElement('div');
        separator1.className = 'toolbox-separator';
        this.windowEl.appendChild(separator1);

        // Champ Todo
        var todoSection = document.createElement('div');
        todoSection.className = 'toolbox-todo-section';

        var todoLabel = document.createElement('div');
        todoLabel.className = 'toolbox-todo-label';
        todoLabel.textContent = 'Todo';
        todoSection.appendChild(todoLabel);

        this.todoInput = document.createElement('textarea');
        this.todoInput.className = 'toolbox-todo-input';
        this.todoInput.placeholder = 'Saisir les t\u00e2ches \u00e0 faire...';
        this.todoInput.addEventListener('input', function () {
            self.todoText = self.todoInput.value;
        });
        todoSection.appendChild(this.todoInput);

        this.windowEl.appendChild(todoSection);

        // Separateur
        var separator2 = document.createElement('div');
        separator2.className = 'toolbox-separator';
        this.windowEl.appendChild(separator2);

        // Champ chemin fichier ODS
        var odsSection = document.createElement('div');
        odsSection.className = 'toolbox-ods-section';

        var odsLabel = document.createElement('div');
        odsLabel.className = 'toolbox-todo-label';
        odsLabel.textContent = 'Fichier ODS (export)';
        odsSection.appendChild(odsLabel);

        var odsRow = document.createElement('div');
        odsRow.className = 'toolbox-ods-row';

        this.odsInput = document.createElement('input');
        this.odsInput.type = 'text';
        this.odsInput.className = 'toolbox-ods-input';
        this.odsInput.placeholder = 'Chemin du fichier .ods...';
        this.odsInput.value = this.odsPath || '';
        this.odsInput.addEventListener('input', function () {
            self.odsPath = self.odsInput.value;
            localStorage.setItem('visio_odsPath', self.odsPath);
        });

        var odsBrowseBtn = document.createElement('button');
        odsBrowseBtn.className = 'toolbox-ods-browse';
        odsBrowseBtn.textContent = 'Parcourir';
        odsBrowseBtn.addEventListener('click', function () {
            fetch('http://127.0.0.1:8765/browse', { mode: 'cors' })
                .then(function (response) { return response.text(); })
                .then(function (filePath) {
                    filePath = filePath.trim();
                    if (filePath) {
                        self.odsPath = filePath;
                        self.odsInput.value = filePath;
                        localStorage.setItem('visio_odsPath', filePath);
                    }
                })
                .catch(function () {
                    alert('Le serveur local n\'est pas lanc\u00e9.\nLancez l\'application via lancer_visio.bat');
                });
        });

        odsRow.appendChild(this.odsInput);
        odsRow.appendChild(odsBrowseBtn);
        odsSection.appendChild(odsRow);
        this.windowEl.appendChild(odsSection);

        // Separateur
        var separator3 = document.createElement('div');
        separator3.className = 'toolbox-separator';
        this.windowEl.appendChild(separator3);

        // Boutons OK / Annuler
        var btnRow = document.createElement('div');
        btnRow.className = 'toolbox-buttons';

        var btnOk = document.createElement('button');
        btnOk.className = 'modal-btn modal-btn-ok';
        btnOk.textContent = 'OK';
        btnOk.addEventListener('click', function () {
            self._saveCurrentTab();
            self.onSave(self.getData());
            self.hide();
        });

        var btnCancel = document.createElement('button');
        btnCancel.className = 'modal-btn modal-btn-cancel';
        btnCancel.textContent = 'Annuler';
        btnCancel.addEventListener('click', function () {
            self._restoreSnapshot();
            self.hide();
        });

        btnRow.appendChild(btnOk);
        btnRow.appendChild(btnCancel);
        this.windowEl.appendChild(btnRow);

        document.body.appendChild(this.windowEl);

        // Drag de la fenetre
        this._setupDrag();

        // Activer le premier onglet
        this._switchTab(this.activeTab);
    }

    _setupDrag() {
        var self = this;
        var isDragging = false;
        var dragOffsetX = 0;
        var dragOffsetY = 0;

        this.titleBar.addEventListener('mousedown', function (e) {
            if (e.target.classList.contains('toolbox-close-btn')) return;
            isDragging = true;
            var rect = self.windowEl.getBoundingClientRect();
            dragOffsetX = e.clientX - rect.left;
            dragOffsetY = e.clientY - rect.top;
            e.preventDefault();
        });

        document.addEventListener('mousemove', function (e) {
            if (!isDragging) return;
            self.windowEl.style.left = (e.clientX - dragOffsetX) + 'px';
            self.windowEl.style.top = (e.clientY - dragOffsetY) + 'px';
            self.windowEl.style.right = 'auto';
        });

        document.addEventListener('mouseup', function () {
            isDragging = false;
        });
    }

    _saveCurrentTab() {
        if (this.activeTab === 'infoprojekt') {
            this._saveInfoProjektFields();
        } else if (this.contentArea.querySelector('.toolbox-textarea')) {
            this.tabData[this.activeTab] = this.contentArea.querySelector('.toolbox-textarea').value;
        }
    }

    _switchTab(tabId) {
        var self = this;

        // Sauvegarder l'onglet actuel
        this._saveCurrentTab();

        // Changer d'onglet
        this.activeTab = tabId;

        // Vider la zone de contenu
        this.contentArea.innerHTML = '';

        if (tabId === 'infoprojekt') {
            this._buildInfoProjektForm();
        } else {
            var textarea = document.createElement('textarea');
            textarea.className = 'toolbox-textarea';
            textarea.placeholder = 'Saisir du contenu...';
            textarea.value = this.tabData[tabId] || '';
            textarea.addEventListener('input', function () {
                self.tabData[self.activeTab] = textarea.value;
            });
            this.contentArea.appendChild(textarea);
        }

        // Mettre a jour l'apparence des onglets
        var tabBtns = this.tabBar.querySelectorAll('.toolbox-tab');
        tabBtns.forEach(function (btn) {
            if (btn.dataset.tabId === tabId) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    _buildInfoProjektForm() {
        var self = this;
        var form = document.createElement('div');
        form.className = 'toolbox-form';

        var data = this.tabData['infoprojekt'] || {};

        this.infoProjektFields.forEach(function (field) {
            var row = document.createElement('div');
            row.className = 'toolbox-form-row';

            var label = document.createElement('label');
            label.className = 'toolbox-form-label';
            label.textContent = field.label;

            var input = document.createElement('input');
            input.type = 'text';
            input.className = 'toolbox-form-input';
            input.dataset.fieldId = field.id;
            input.value = data[field.id] || '';
            input.addEventListener('input', function () {
                if (!self.tabData['infoprojekt']) self.tabData['infoprojekt'] = {};
                self.tabData['infoprojekt'][field.id] = input.value;
            });

            row.appendChild(label);
            row.appendChild(input);
            form.appendChild(row);
        });

        this.contentArea.appendChild(form);
    }

    _saveInfoProjektFields() {
        var inputs = this.contentArea.querySelectorAll('.toolbox-form-input');
        var self = this;
        if (!this.tabData['infoprojekt']) this.tabData['infoprojekt'] = {};
        inputs.forEach(function (input) {
            self.tabData['infoprojekt'][input.dataset.fieldId] = input.value;
        });
    }

    _takeSnapshot() {
        this._snapshot = JSON.stringify({
            tabData: this.tabData,
            todoText: this.todoText,
            odsPath: this.odsPath
        });
    }

    _restoreSnapshot() {
        if (!this._snapshot) return;
        var data = JSON.parse(this._snapshot);
        this.tabData = data.tabData;
        this.todoText = data.todoText;
        this.todoInput.value = this.todoText;
        this.odsPath = data.odsPath || '';
        this.odsInput.value = this.odsPath;
        this._snapshot = null;
    }

    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    show() {
        this._takeSnapshot();
        this._switchTab(this.activeTab);
        this.windowEl.style.display = 'flex';
        this.isVisible = true;
    }

    hide() {
        this.windowEl.style.display = 'none';
        this.isVisible = false;
    }

    getData() {
        this._saveCurrentTab();
        return {
            tabData: JSON.parse(JSON.stringify(this.tabData)),
            todoText: this.todoInput.value,
            odsPath: this.odsPath || ''
        };
    }

    setData(data) {
        if (!data) return;
        if (data.tabData) {
            var self = this;
            Object.keys(data.tabData).forEach(function (key) {
                self.tabData[key] = data.tabData[key];
            });
        }
        if (data.todoText !== undefined) {
            this.todoText = data.todoText;
            this.todoInput.value = data.todoText;
        }
        if (data.odsPath !== undefined) {
            this.odsPath = data.odsPath;
            this.odsInput.value = data.odsPath;
        }
        this._switchTab(this.activeTab);
    }
}
