class ToolboxWindow {
    constructor() {
        this.isVisible = false;
        this.activeTab = 'email';
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
        this.tabData = {};
        this.tabs.forEach(function (tab) {
            this.tabData[tab.id] = '';
        }.bind(this));
        this.todoText = '';

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

        this.contentTextarea = document.createElement('textarea');
        this.contentTextarea.className = 'toolbox-textarea';
        this.contentTextarea.placeholder = 'Saisir du contenu...';
        this.contentTextarea.addEventListener('input', function () {
            self.tabData[self.activeTab] = self.contentTextarea.value;
        });

        this.contentArea.appendChild(this.contentTextarea);
        this.windowEl.appendChild(this.contentArea);

        // Separateur
        var separator = document.createElement('div');
        separator.className = 'toolbox-separator';
        this.windowEl.appendChild(separator);

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

    _switchTab(tabId) {
        // Sauvegarder le contenu de l'onglet actuel
        this.tabData[this.activeTab] = this.contentTextarea.value;

        // Changer d'onglet
        this.activeTab = tabId;
        this.contentTextarea.value = this.tabData[tabId] || '';

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

    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    show() {
        this.windowEl.style.display = 'flex';
        this.isVisible = true;
    }

    hide() {
        this.tabData[this.activeTab] = this.contentTextarea.value;
        this.windowEl.style.display = 'none';
        this.isVisible = false;
    }

    getData() {
        this.tabData[this.activeTab] = this.contentTextarea.value;
        return {
            tabData: Object.assign({}, this.tabData),
            todoText: this.todoInput.value
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
        this.contentTextarea.value = this.tabData[this.activeTab] || '';
    }
}
