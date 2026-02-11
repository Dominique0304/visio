class ContextMenu {
    constructor(callbacks) {
        this.callbacks = callbacks;
        this.targetScreenshotId = null;
        this.menuEl = null;

        this._buildMenu();
        this._setupCloseListener();
    }

    _buildMenu() {
        this.menuEl = document.createElement('div');
        this.menuEl.className = 'context-menu';
        this.menuEl.style.display = 'none';

        var items = [
            { label: 'Commentaires', action: 'onComment' },
            { label: 'Ins\u00e9rer lien hypertexte', action: 'onInsertLink' },
            { label: 'Afficher lien hypertexte', action: 'onShowLink' },
            { label: 'Supprimer', action: 'onDelete', className: 'context-menu-danger' }
        ];

        var self = this;
        items.forEach(function (item) {
            var div = document.createElement('div');
            div.className = 'context-menu-item' + (item.className ? ' ' + item.className : '');
            div.textContent = item.label;
            div.addEventListener('click', function (e) {
                e.stopPropagation();
                var id = self.targetScreenshotId;
                self.hide();
                if (self.callbacks[item.action]) {
                    self.callbacks[item.action](id);
                }
            });
            self.menuEl.appendChild(div);
        });

        document.body.appendChild(this.menuEl);
    }

    _setupCloseListener() {
        var self = this;
        document.addEventListener('mousedown', function (e) {
            if (self.menuEl.style.display !== 'none' && !self.menuEl.contains(e.target)) {
                self.hide();
            }
        });
    }

    show(x, y, screenshotId) {
        this.targetScreenshotId = screenshotId;
        this.menuEl.style.left = x + 'px';
        this.menuEl.style.top = y + 'px';
        this.menuEl.style.display = 'block';

        var rect = this.menuEl.getBoundingClientRect();
        var viewW = window.innerWidth;
        var viewH = window.innerHeight;

        if (rect.right > viewW) {
            this.menuEl.style.left = (x - rect.width) + 'px';
        }
        if (rect.bottom > viewH) {
            this.menuEl.style.top = (y - rect.height) + 'px';
        }
    }

    hide() {
        this.menuEl.style.display = 'none';
        this.targetScreenshotId = null;
    }
}
