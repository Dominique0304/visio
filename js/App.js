class App {
    constructor() {
        this.projectManager = new ProjectManager();
        this.fileManager = new FileManager();
        this.configManager = new ConfigManager();
        this.layoutEngine = new LayoutEngine(
            this.configManager.getDefault('pageWidth'),
            this.configManager.getDefault('pageHeight')
        );
        this.dragManager = new DragManager(this._onDragEnd.bind(this));

        this.canvas = document.getElementById('page-canvas');
        this.currentZoom = 50;
        this.selectedScreenshotId = null;

        this._initTabBar();
        this._initToolbar();
        this._initPageNavigator();
        this._setupPasteListener();
        this._setupKeyboardShortcuts();
        this._setupCanvasClick();

        this.newProject();
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

    _setupPasteListener() {
        document.addEventListener('paste', this._handlePaste.bind(this));
    }

    _setupKeyboardShortcuts() {
        document.addEventListener('keydown', function (e) {
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.saveProject();
            }
            if (e.key === 'Delete' && this.selectedScreenshotId) {
                this.deleteSelectedScreenshot();
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

    // --- Positionnement ---

    positionScreenshots() {
        var project = this.projectManager.getActive();
        if (!project) return;
        this.layoutEngine.positionAll(project);
        project.markModified();
        this._updateAll();
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
        this.currentZoom = zoomPercent;
        this._applyZoom();
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

    deleteSelectedScreenshot() {
        var project = this.projectManager.getActive();
        if (!project || !this.selectedScreenshotId) return;
        var page = project.getCurrentPage();
        page.removeScreenshot(this.selectedScreenshotId);
        this.selectedScreenshotId = null;
        project.markModified();
        this.renderPage();
        this._updateTabBar();
    }

    _selectScreenshot(id) {
        this._deselectAll();
        this.selectedScreenshotId = id;
        var el = this.canvas.querySelector('.screenshot-wrapper[data-id="' + id + '"]');
        if (el) el.classList.add('selected');
    }

    _deselectAll() {
        this.selectedScreenshotId = null;
        var prev = this.canvas.querySelector('.screenshot-wrapper.selected');
        if (prev) prev.classList.remove('selected');
    }

    _onDragEnd() {
        var project = this.projectManager.getActive();
        if (project) {
            project.markModified();
            this._updateTabBar();
        }
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

        var self = this;
        page.screenshots.forEach(function (screenshot) {
            var wrapper = document.createElement('div');
            wrapper.className = 'screenshot-wrapper' + (screenshot.positioned ? ' positioned' : '');
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
            dateDiv.addEventListener('blur', function (e) {
                screenshot.date = e.target.textContent;
                project.markModified();
                self._updateTabBar();
            });
            dateDiv.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    dateDiv.blur();
                }
            });

            wrapper.addEventListener('click', function (e) {
                e.stopPropagation();
                self._selectScreenshot(screenshot.id);
            });

            wrapper.addEventListener('mousedown', function (e) {
                if (e.target.contentEditable === 'true') return;
                if (screenshot.positioned) {
                    self.dragManager.startDrag(e, wrapper, screenshot);
                }
            });

            wrapper.appendChild(img);
            wrapper.appendChild(dateDiv);
            self.canvas.appendChild(wrapper);
        });

        this._applyZoom();
    }

    _applyZoom() {
        var scale = this.currentZoom / 100;
        this.canvas.style.transform = 'scale(' + scale + ')';
        this.canvas.dataset.scale = scale;

        var container = document.getElementById('page-container');
        container.style.width = (2480 * scale) + 'px';
        container.style.height = (1754 * scale) + 'px';
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
