class App {
    constructor() {
        this.projectManager = new ProjectManager();
        this.fileManager = new FileManager();
        this.configManager = new ConfigManager();
        this.layoutEngine = new LayoutEngine(
            this.configManager.getDefault('pageWidth'),
            this.configManager.getDefault('pageHeight'),
            this.configManager.getDefault('pageMargin')
        );
        this.dragManager = new DragManager(this._onDragEnd.bind(this), this._onDragStart.bind(this));

        this.canvas = document.getElementById('page-canvas');
        this.container = document.getElementById('page-container');
        this.workspace = document.getElementById('workspace');

        this.viewTransform = { x: 0, y: 0, scale: 0.5 };
        this.selectedScreenshotIds = new Set();
        this.referencePoint = null;
        this.undoStack = [];
        this.redoStack = [];
        this.maxHistory = 20;

        this._initTabBar();
        this._initToolbar();
        this._initPageNavigator();
        this._initContextMenu();
        this._wasDragging = false;
        this._selectionChangedOnMousedown = false;

        this._setupPasteListener();
        this._setupKeyboardShortcuts();
        this._setupCanvasClick();
        this._setupWheelZoom();
        this._setupPan();
        this._setupSelectionRect();

        this.newProject();
        this._centerView();
    }

    _initTabBar() {
        this.tabBar = new TabBar(document.getElementById('tab-bar'), {
            onTabSelect: this.selectProject.bind(this),
            onTabClose: this.closeProject.bind(this),
            onTabRename: this.renameProject.bind(this),
            onNewTab: this.newProject.bind(this)
        });
    }

    _initToolbar() {
        this.toolbar = new Toolbar(document.getElementById('toolbar'), {
            onNew: this.newProject.bind(this),
            onOpen: this.openProject.bind(this),
            onSave: this.saveProject.bind(this),
            onPosition: this.positionScreenshots.bind(this),
            onInitialize: this.initializeReference.bind(this),
            onReorganize: this.reorganize.bind(this),
            onUndo: this.undo.bind(this),
            onRedo: this.redo.bind(this),
            onHeightChange: this.changeImageHeight.bind(this),
            onZoomChange: this.changeZoom.bind(this)
        });
    }

    _initPageNavigator() {
        this.pageNavigator = new PageNavigator(document.getElementById('page-navigator'), {
            onPrev: this.prevPage.bind(this),
            onNext: this.nextPage.bind(this),
            onAdd: this.addPage.bind(this),
            onRemove: this.removePage.bind(this)
        });
    }

    _initContextMenu() {
        this.contextMenu = new ContextMenu({
            onComment: this._onContextComment.bind(this),
            onInsertLink: this._onContextInsertLink.bind(this),
            onShowLink: this._onContextShowLink.bind(this),
            onDelete: this._onContextDelete.bind(this)
        });
    }

    _onContextComment(screenshotId) {
        var project = this.projectManager.getActive();
        if (!project || !screenshotId) return;
        var page = project.getCurrentPage();
        var screenshot = page.getScreenshot(screenshotId);
        if (!screenshot) return;

        var self = this;
        var overlay = document.createElement('div');
        overlay.className = 'modal-overlay';

        var dialog = document.createElement('div');
        dialog.className = 'modal-dialog';

        var title = document.createElement('div');
        title.className = 'modal-title';
        title.textContent = 'Commentaire';

        var textarea = document.createElement('textarea');
        textarea.className = 'modal-textarea';
        textarea.value = screenshot.comment || '';
        textarea.placeholder = 'Saisir un commentaire...';

        var btnRow = document.createElement('div');
        btnRow.className = 'modal-buttons';

        var btnOk = document.createElement('button');
        btnOk.className = 'modal-btn modal-btn-ok';
        btnOk.textContent = 'OK';
        btnOk.addEventListener('click', function () {
            var newComment = textarea.value.trim();
            if (newComment !== (screenshot.comment || '')) {
                self._saveState();
                screenshot.comment = newComment;
                project.markModified();
                self.renderPage();
                self._updateTabBar();
            }
            document.body.removeChild(overlay);
        });

        var btnCancel = document.createElement('button');
        btnCancel.className = 'modal-btn modal-btn-cancel';
        btnCancel.textContent = 'Annuler';
        btnCancel.addEventListener('click', function () {
            document.body.removeChild(overlay);
        });

        btnRow.appendChild(btnOk);
        btnRow.appendChild(btnCancel);
        dialog.appendChild(title);
        dialog.appendChild(textarea);
        dialog.appendChild(btnRow);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        textarea.focus();
    }

    _onContextInsertLink(screenshotId) {
        // TODO
    }

    _onContextShowLink(screenshotId) {
        // TODO
    }

    _onContextDelete(screenshotId) {
        if (!screenshotId) return;
        var project = this.projectManager.getActive();
        if (!project) return;
        this._saveState();
        var page = project.getCurrentPage();
        page.removeScreenshot(screenshotId);
        this.selectedScreenshotIds.delete(screenshotId);
        project.markModified();
        this.renderPage();
        this._updateTabBar();
    }

    _setupPasteListener() {
        document.addEventListener('paste', this._handlePaste.bind(this));
    }

    _setupKeyboardShortcuts() {
        document.addEventListener('keydown', function (e) {
            var tag = document.activeElement ? document.activeElement.tagName : '';
            var isEditing = (tag === 'INPUT' || tag === 'TEXTAREA' ||
                document.activeElement.contentEditable === 'true');

            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.saveProject();
            }
            if (e.ctrlKey && e.key === 'z') {
                e.preventDefault();
                this.undo();
            }
            if (e.ctrlKey && e.key === 'y') {
                e.preventDefault();
                this.redo();
            }
            if (e.key === 'Delete' && this.selectedScreenshotIds.size > 0 && !isEditing) {
                this.deleteSelectedScreenshots();
            }
        }.bind(this));
    }

    _setupCanvasClick() {
        this.canvas.addEventListener('click', function (e) {
            if (e.target === this.canvas) {
                this._deselectAll();
            }
        }.bind(this));
    }

    // --- Zoom molette centre sur le pointeur ---

    _setupWheelZoom() {
        var self = this;
        this.workspace.addEventListener('wheel', function (e) {
            e.preventDefault();

            var oldScale = self.viewTransform.scale;
            var zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
            var newScale = oldScale * zoomFactor;
            newScale = Math.max(0.1, Math.min(3.0, newScale));

            var rect = self.workspace.getBoundingClientRect();
            var mouseX = e.clientX - rect.left;
            var mouseY = e.clientY - rect.top;

            var canvasX = (mouseX - self.viewTransform.x) / oldScale;
            var canvasY = (mouseY - self.viewTransform.y) / oldScale;

            self.viewTransform.x = mouseX - canvasX * newScale;
            self.viewTransform.y = mouseY - canvasY * newScale;
            self.viewTransform.scale = newScale;

            self._applyView();
        }, { passive: false });
    }

    // --- Pan avec clic gauche ---

    _setupPan() {
        var self = this;
        var isPanning = false;
        var startX, startY, startTx, startTy;

        this.workspace.addEventListener('mousedown', function (e) {
            if (e.button !== 0) return;
            if (e.target.closest('.screenshot-wrapper')) return;
            if (e.shiftKey) return;

            if (document.activeElement && document.activeElement.tagName === 'INPUT') {
                document.activeElement.blur();
            }

            isPanning = true;
            startX = e.clientX;
            startY = e.clientY;
            startTx = self.viewTransform.x;
            startTy = self.viewTransform.y;
            self.workspace.classList.add('panning');
            e.preventDefault();
        });

        document.addEventListener('mousemove', function (e) {
            if (!isPanning) return;
            self.viewTransform.x = startTx + (e.clientX - startX);
            self.viewTransform.y = startTy + (e.clientY - startY);
            self._applyView();
        });

        document.addEventListener('mouseup', function () {
            if (isPanning) {
                isPanning = false;
                self.workspace.classList.remove('panning');
            }
        });
    }

    _handlePaste(event) {
        if (event.target.contentEditable === 'true' || event.target.tagName === 'INPUT') {
            return;
        }

        var project = this.projectManager.getActive();
        if (!project) return;

        var items = event.clipboardData.items;
        for (var i = 0; i < items.length; i++) {
            if (items[i].type.startsWith('image/')) {
                event.preventDefault();
                var blob = items[i].getAsFile();
                var reader = new FileReader();
                var self = this;
                reader.onload = function (e) {
                    var img = new Image();
                    img.onload = function () {
                        var screenshot = new Screenshot({
                            imageData: e.target.result,
                            originalWidth: img.naturalWidth,
                            originalHeight: img.naturalHeight
                        });

                        if (self.referencePoint) {
                            screenshot.resize(project.imageHeight);
                            var pageWidth = self.configManager.getDefault('pageWidth');
                            var margin = self.configManager.getDefault('pageMargin');
                            var gap = 10;
                            var maxX = pageWidth - margin;

                            if (self.referencePoint.x + screenshot.width > maxX && self.referencePoint.x > self.referencePoint.rowStartX) {
                                self.referencePoint.x = self.referencePoint.rowStartX;
                                self.referencePoint.y += self.referencePoint.rowHeight + gap;
                                self.referencePoint.rowHeight = 0;
                            }

                            screenshot.x = self.referencePoint.x;
                            screenshot.y = self.referencePoint.y;
                            screenshot.positioned = true;

                            self.referencePoint.x += screenshot.width + gap;
                            self.referencePoint.rowHeight = Math.max(
                                self.referencePoint.rowHeight,
                                screenshot.height + 30
                            );
                        }

                        self._saveState();
                        project.getCurrentPage().addScreenshot(screenshot);
                        project.markModified();
                        self.renderPage();
                        self._updateTabBar();
                    };
                    img.src = e.target.result;
                };
                reader.readAsDataURL(blob);
                break;
            }
        }
    }

    // --- Projets ---

    newProject() {
        var project = new Project({ name: 'Nouveau Projet' });
        project.imageHeight = this.configManager.getDefault('imageHeight');
        this.projectManager.addProject(project);
        this.toolbar.updateHeight(project.imageHeight);
        this._updateAll();
    }

    async openProject() {
        var project = await this.fileManager.openProject();
        if (project) {
            this.projectManager.addProject(project);
            this.toolbar.updateHeight(project.imageHeight);
            this._updateAll();
            this._centerView();
        }
    }

    async saveProject() {
        var project = this.projectManager.getActive();
        if (!project) return;
        var success = await this.fileManager.saveProject(project);
        if (success) {
            this._updateTabBar();
        }
    }

    selectProject(index) {
        this.projectManager.setActive(index);
        var project = this.projectManager.getActive();
        if (project) {
            this.toolbar.updateHeight(project.imageHeight);
        }
        this._updateAll();
    }

    closeProject(index) {
        var project = this.projectManager.projects[index];
        if (project && project.modified) {
            if (!confirm('Le projet "' + project.name + '" a des modifications non sauvegardees. Fermer quand meme ?')) {
                return;
            }
        }
        this.projectManager.removeProject(index);
        if (this.projectManager.projects.length === 0) {
            this.newProject();
        } else {
            this._updateAll();
        }
    }

    renameProject(index, newName) {
        this.projectManager.projects[index].name = newName;
        this.projectManager.projects[index].markModified();
        this._updateTabBar();
    }

    // --- Undo / Redo ---

    _saveState() {
        var project = this.projectManager.getActive();
        if (!project) return;
        var snapshot = JSON.stringify(project.toJSON());
        this.undoStack.push(snapshot);
        if (this.undoStack.length > this.maxHistory) {
            this.undoStack.shift();
        }
        this.redoStack = [];
    }

    undo() {
        var project = this.projectManager.getActive();
        if (!project || this.undoStack.length === 0) return;

        var currentSnapshot = JSON.stringify(project.toJSON());
        this.redoStack.push(currentSnapshot);

        var previousSnapshot = this.undoStack.pop();
        this._restoreState(previousSnapshot);
    }

    redo() {
        var project = this.projectManager.getActive();
        if (!project || this.redoStack.length === 0) return;

        var currentSnapshot = JSON.stringify(project.toJSON());
        this.undoStack.push(currentSnapshot);

        var nextSnapshot = this.redoStack.pop();
        this._restoreState(nextSnapshot);
    }

    _restoreState(snapshot) {
        var data = JSON.parse(snapshot);
        var project = this.projectManager.getActive();
        if (!project) return;

        var restored = Project.fromJSON(data);
        project.pages = restored.pages;
        project.imageHeight = restored.imageHeight;
        project.name = restored.name;
        project.currentPageIndex = Math.min(project.currentPageIndex, project.pages.length - 1);
        project.markModified();

        this.toolbar.updateHeight(project.imageHeight);
        this.selectedScreenshotIds.clear();
        this._updateAll();
    }

    // --- Initialisation / Positionnement ---

    initializeReference() {
        var project = this.projectManager.getActive();
        if (!project || this.selectedScreenshotIds.size === 0) {
            alert('Selectionnez une image avant de cliquer sur Initialiser.');
            return;
        }
        var page = project.getCurrentPage();
        var firstId = this.selectedScreenshotIds.values().next().value;
        var screenshot = page.getScreenshot(firstId);
        if (!screenshot) return;

        var gap = 10;
        this.referencePoint = {
            x: screenshot.x + screenshot.width + gap,
            y: screenshot.y,
            rowStartX: screenshot.x,
            rowHeight: screenshot.height + 30
        };

        this.toolbar.showReferenceStatus(true);
    }

    positionScreenshots() {
        var project = this.projectManager.getActive();
        if (!project || this.selectedScreenshotIds.size === 0) {
            alert('Selectionnez une ou plusieurs images a positionner.');
            return;
        }

        var page = project.getCurrentPage();
        this._saveState();
        var margin = this.configManager.getDefault('pageMargin');
        var pageWidth = this.configManager.getDefault('pageWidth');
        var maxX = pageWidth - margin;
        var gap = 10;
        var self = this;

        if (!this.referencePoint) {
            this.referencePoint = {
                x: margin,
                y: margin,
                rowStartX: margin,
                rowHeight: 0
            };
        }

        this.selectedScreenshotIds.forEach(function (id) {
            var screenshot = page.getScreenshot(id);
            if (!screenshot) return;

            screenshot.resize(project.imageHeight);

            if (self.referencePoint.x + screenshot.width > maxX && self.referencePoint.x > self.referencePoint.rowStartX) {
                self.referencePoint.x = self.referencePoint.rowStartX;
                self.referencePoint.y += self.referencePoint.rowHeight + gap;
                self.referencePoint.rowHeight = 0;
            }

            screenshot.x = self.referencePoint.x;
            screenshot.y = self.referencePoint.y;
            screenshot.positioned = true;

            self.referencePoint.x += screenshot.width + gap;
            self.referencePoint.rowHeight = Math.max(
                self.referencePoint.rowHeight,
                screenshot.height + 30
            );
        });

        project.markModified();
        this.renderPage();
        this._updateTabBar();
    }

    // --- Reorganisation ---

    _computeIndices(screenshots, imageHeight) {
        var positioned = screenshots.filter(function (s) { return s.positioned; });
        if (positioned.length === 0) return;

        var sorted = positioned.slice().sort(function (a, b) { return a.y - b.y; });
        var threshold = imageHeight / 2;
        var rows = [];
        var currentRow = [sorted[0]];
        var rowY = sorted[0].y;

        for (var i = 1; i < sorted.length; i++) {
            if (sorted[i].y - rowY > threshold) {
                rows.push(currentRow);
                currentRow = [sorted[i]];
                rowY = sorted[i].y;
            } else {
                currentRow.push(sorted[i]);
            }
        }
        rows.push(currentRow);

        var index = 1;
        rows.forEach(function (row) {
            row.sort(function (a, b) { return a.x - b.x; });
            row.forEach(function (screenshot) {
                screenshot.index = index++;
            });
        });
    }

    reorganize() {
        var project = this.projectManager.getActive();
        if (!project) return;

        var page = project.getCurrentPage();
        if (page.screenshots.length === 0) return;

        this._saveState();
        var margin = this.configManager.getDefault('pageMargin');
        var pageWidth = this.configManager.getDefault('pageWidth');
        var maxX = pageWidth - margin;
        var gap = 10;
        var dateAreaHeight = 30;

        this._computeIndices(page.screenshots, project.imageHeight);

        page.screenshots.sort(function (a, b) {
            var ia = a.index || 0;
            var ib = b.index || 0;
            return ia - ib;
        });

        var currentX = margin;
        var currentY = margin;
        var rowHeight = 0;

        page.screenshots.forEach(function (screenshot) {
            screenshot.resize(project.imageHeight);
            var itemHeight = screenshot.height + dateAreaHeight;

            if (currentX + screenshot.width > maxX && currentX > margin) {
                currentX = margin;
                currentY += rowHeight + gap;
                rowHeight = 0;
            }

            screenshot.x = currentX;
            screenshot.y = currentY;
            screenshot.positioned = true;

            currentX += screenshot.width + gap;
            rowHeight = Math.max(rowHeight, itemHeight);
        });

        this._computeIndices(page.screenshots, project.imageHeight);

        project.markModified();
        this.renderPage();
        this._updateTabBar();
    }

    // --- Configuration ---

    changeImageHeight(height) {
        var project = this.projectManager.getActive();
        if (!project) return;
        project.imageHeight = height;
        project.markModified();
        this._updateTabBar();
    }

    changeZoom(zoomPercent) {
        var oldScale = this.viewTransform.scale;
        var newScale = zoomPercent / 100;

        var rect = this.workspace.getBoundingClientRect();
        var centerX = rect.width / 2;
        var centerY = rect.height / 2;

        var canvasX = (centerX - this.viewTransform.x) / oldScale;
        var canvasY = (centerY - this.viewTransform.y) / oldScale;

        this.viewTransform.x = centerX - canvasX * newScale;
        this.viewTransform.y = centerY - canvasY * newScale;
        this.viewTransform.scale = newScale;

        this._applyView();
    }

    // --- Pages ---

    prevPage() {
        var project = this.projectManager.getActive();
        if (!project || project.currentPageIndex <= 0) return;
        project.currentPageIndex--;
        this.renderPage();
        this._updatePageNavigator();
    }

    nextPage() {
        var project = this.projectManager.getActive();
        if (!project || project.currentPageIndex >= project.pages.length - 1) return;
        project.currentPageIndex++;
        this.renderPage();
        this._updatePageNavigator();
    }

    addPage() {
        var project = this.projectManager.getActive();
        if (!project) return;
        project.addPage();
        project.currentPageIndex = project.pages.length - 1;
        project.markModified();
        this._updateAll();
    }

    removePage() {
        var project = this.projectManager.getActive();
        if (!project || project.pages.length <= 1) return;
        if (confirm('Supprimer cette page et toutes ses images ?')) {
            project.removePage(project.currentPageIndex);
            project.markModified();
            this._updateAll();
        }
    }

    // --- Screenshots ---

    deleteSelectedScreenshots() {
        var project = this.projectManager.getActive();
        if (!project || this.selectedScreenshotIds.size === 0) return;
        this._saveState();
        var page = project.getCurrentPage();
        var self = this;
        this.selectedScreenshotIds.forEach(function (id) {
            page.removeScreenshot(id);
        });
        self.selectedScreenshotIds.clear();
        project.markModified();
        this.renderPage();
        this._updateTabBar();
    }

    _selectScreenshot(id, shiftKey) {
        if (shiftKey) {
            if (this.selectedScreenshotIds.has(id)) {
                this.selectedScreenshotIds.delete(id);
                var el = this.canvas.querySelector('.screenshot-wrapper[data-id="' + id + '"]');
                if (el) el.classList.remove('selected');
            } else {
                this.selectedScreenshotIds.add(id);
                var el = this.canvas.querySelector('.screenshot-wrapper[data-id="' + id + '"]');
                if (el) el.classList.add('selected');
            }
        } else {
            this._deselectAll();
            this.selectedScreenshotIds.add(id);
            var el = this.canvas.querySelector('.screenshot-wrapper[data-id="' + id + '"]');
            if (el) el.classList.add('selected');
        }
    }

    _deselectAll() {
        this.selectedScreenshotIds.clear();
        var allSelected = this.canvas.querySelectorAll('.screenshot-wrapper.selected');
        allSelected.forEach(function (el) { el.classList.remove('selected'); });
    }

    _onDragStart() {
        this._saveState();
        this._wasDragging = true;
    }

    _onDragEnd() {
        var project = this.projectManager.getActive();
        if (project) {
            project.markModified();
            this._updateTabBar();
        }
    }

    // --- Selection par rectangle (Shift + clic gauche + deplacement) ---

    _setupSelectionRect() {
        var self = this;
        var isSelecting = false;
        var startX, startY;
        var rectEl = null;

        this.workspace.addEventListener('mousedown', function (e) {
            if (e.button !== 0) return;
            if (!e.shiftKey) return;
            if (e.target.closest('.screenshot-wrapper')) return;

            isSelecting = true;
            startX = e.clientX;
            startY = e.clientY;

            rectEl = document.createElement('div');
            rectEl.className = 'selection-rect';
            var wsRect = self.workspace.getBoundingClientRect();
            rectEl.style.left = (e.clientX - wsRect.left) + 'px';
            rectEl.style.top = (e.clientY - wsRect.top) + 'px';
            rectEl.style.width = '0px';
            rectEl.style.height = '0px';
            self.workspace.appendChild(rectEl);

            e.preventDefault();
        });

        document.addEventListener('mousemove', function (e) {
            if (!isSelecting) return;

            var wsRect = self.workspace.getBoundingClientRect();
            var currentX = e.clientX;
            var currentY = e.clientY;

            var x = Math.min(startX, currentX) - wsRect.left;
            var y = Math.min(startY, currentY) - wsRect.top;
            var w = Math.abs(currentX - startX);
            var h = Math.abs(currentY - startY);

            rectEl.style.left = x + 'px';
            rectEl.style.top = y + 'px';
            rectEl.style.width = w + 'px';
            rectEl.style.height = h + 'px';
        });

        document.addEventListener('mouseup', function (e) {
            if (!isSelecting) return;
            isSelecting = false;

            var wsRect = self.workspace.getBoundingClientRect();
            var selLeft = Math.min(startX, e.clientX) - wsRect.left;
            var selTop = Math.min(startY, e.clientY) - wsRect.top;
            var selRight = Math.max(startX, e.clientX) - wsRect.left;
            var selBottom = Math.max(startY, e.clientY) - wsRect.top;

            var t = self.viewTransform;
            var canvasLeft = (selLeft - t.x) / t.scale;
            var canvasTop = (selTop - t.y) / t.scale;
            var canvasRight = (selRight - t.x) / t.scale;
            var canvasBottom = (selBottom - t.y) / t.scale;

            var project = self.projectManager.getActive();
            if (project) {
                var page = project.getCurrentPage();
                page.screenshots.forEach(function (screenshot) {
                    if (!screenshot.positioned) return;
                    var sx = screenshot.x;
                    var sy = screenshot.y;
                    var sw = screenshot.width;
                    var sh = screenshot.height + 30;

                    if (sx + sw > canvasLeft && sx < canvasRight &&
                        sy + sh > canvasTop && sy < canvasBottom) {
                        self.selectedScreenshotIds.add(screenshot.id);
                        var el = self.canvas.querySelector('.screenshot-wrapper[data-id="' + screenshot.id + '"]');
                        if (el) el.classList.add('selected');
                    }
                });
            }

            if (rectEl && rectEl.parentNode) {
                rectEl.parentNode.removeChild(rectEl);
            }
            rectEl = null;
        });
    }

    _buildDragItems(screenshotId) {
        var project = this.projectManager.getActive();
        if (!project) return [];
        var page = project.getCurrentPage();
        var items = [];
        var self = this;

        if (this.selectedScreenshotIds.has(screenshotId)) {
            this.selectedScreenshotIds.forEach(function (id) {
                var el = self.canvas.querySelector('.screenshot-wrapper[data-id="' + id + '"]');
                var ss = page.getScreenshot(id);
                if (el && ss && ss.positioned) {
                    items.push({ element: el, screenshot: ss });
                }
            });
        } else {
            var el = self.canvas.querySelector('.screenshot-wrapper[data-id="' + screenshotId + '"]');
            var ss = page.getScreenshot(screenshotId);
            if (el && ss) {
                items.push({ element: el, screenshot: ss });
            }
        }
        return items;
    }

    // --- Rendu ---

    renderPage() {
        var project = this.projectManager.getActive();
        this.canvas.innerHTML = '';

        if (!project) return;

        var page = project.getCurrentPage();

        if (page.screenshots.length === 0) {
            var hint = document.createElement('div');
            hint.className = 'canvas-hint';
            hint.textContent = 'Collez vos captures d\'ecran ici (Ctrl+V)';
            this.canvas.appendChild(hint);
        }

        this._computeIndices(page.screenshots, project.imageHeight);

        var self = this;
        page.screenshots.forEach(function (screenshot) {
            var wrapper = document.createElement('div');
            var cls = 'screenshot-wrapper';
            if (screenshot.positioned) cls += ' positioned';
            if (screenshot.comment) cls += ' has-comment';
            wrapper.className = cls;
            wrapper.dataset.id = screenshot.id;

            if (screenshot.positioned) {
                wrapper.style.left = screenshot.x + 'px';
                wrapper.style.top = screenshot.y + 'px';
                wrapper.style.width = screenshot.width + 'px';
            }

            var img = document.createElement('img');
            img.src = screenshot.imageData;
            img.className = 'screenshot-image';
            img.draggable = false;
            if (screenshot.positioned) {
                img.style.width = screenshot.width + 'px';
                img.style.height = screenshot.height + 'px';
            }

            var dateDiv = document.createElement('div');
            dateDiv.className = 'screenshot-date';
            dateDiv.contentEditable = true;
            dateDiv.textContent = screenshot.date;
            dateDiv.addEventListener('focus', function () {
                self._dateBefore = screenshot.date;
            });
            dateDiv.addEventListener('blur', function (e) {
                var newDate = e.target.textContent;
                if (newDate !== self._dateBefore) {
                    self._saveState();
                    screenshot.date = newDate;
                    project.markModified();
                    self._updateTabBar();
                }
            });
            dateDiv.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    dateDiv.blur();
                }
            });

            wrapper.addEventListener('click', function (e) {
                e.stopPropagation();
                if (self._wasDragging) {
                    self._wasDragging = false;
                    return;
                }
                if (self._selectionChangedOnMousedown) {
                    self._selectionChangedOnMousedown = false;
                    return;
                }
                self._selectScreenshot(screenshot.id, e.shiftKey);
            });

            wrapper.addEventListener('mousedown', function (e) {
                if (e.target.contentEditable === 'true') return;
                if (!screenshot.positioned) return;

                self._selectionChangedOnMousedown = false;

                if (!self.selectedScreenshotIds.has(screenshot.id)) {
                    if (e.shiftKey) {
                        self.selectedScreenshotIds.add(screenshot.id);
                        wrapper.classList.add('selected');
                    } else {
                        self._deselectAll();
                        self.selectedScreenshotIds.add(screenshot.id);
                        wrapper.classList.add('selected');
                    }
                    self._selectionChangedOnMousedown = true;
                }

                var items = self._buildDragItems(screenshot.id);
                self.dragManager.startDrag(e, items);
            });

            wrapper.addEventListener('contextmenu', function (e) {
                e.preventDefault();
                e.stopPropagation();
                if (!self.selectedScreenshotIds.has(screenshot.id)) {
                    self._deselectAll();
                    self.selectedScreenshotIds.add(screenshot.id);
                    wrapper.classList.add('selected');
                }
                self.contextMenu.show(e.clientX, e.clientY, screenshot.id);
            });

            if (screenshot.positioned && screenshot.index !== undefined) {
                var badge = document.createElement('div');
                badge.className = 'screenshot-index';
                badge.textContent = screenshot.index;
                wrapper.appendChild(badge);
            }

            if (self.selectedScreenshotIds.has(screenshot.id)) {
                wrapper.classList.add('selected');
            }

            wrapper.appendChild(img);
            wrapper.appendChild(dateDiv);
            self.canvas.appendChild(wrapper);
        });

        this._applyView();
    }

    _applyView() {
        var t = this.viewTransform;
        this.container.style.transform = 'translate(' + t.x + 'px, ' + t.y + 'px) scale(' + t.scale + ')';
        this.canvas.dataset.scale = t.scale;
        this.toolbar.updateZoom(Math.round(t.scale * 100));
    }

    _centerView() {
        var rect = this.workspace.getBoundingClientRect();
        var scale = this.viewTransform.scale;
        this.viewTransform.x = (rect.width - 2480 * scale) / 2;
        this.viewTransform.y = (rect.height - 1754 * scale) / 2;
        this._applyView();
    }

    _updateAll() {
        this._updateTabBar();
        this.renderPage();
        this._updatePageNavigator();
    }

    _updateTabBar() {
        this.tabBar.render(this.projectManager.projects, this.projectManager.activeIndex);
    }

    _updatePageNavigator() {
        var project = this.projectManager.getActive();
        if (project) {
            this.pageNavigator.render(project.currentPageIndex + 1, project.getTotalPages());
        }
    }
}

document.addEventListener('DOMContentLoaded', function () {
    window.app = new App();
});
