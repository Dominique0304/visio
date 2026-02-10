class TabBar {
    constructor(container, callbacks) {
        this.container = container;
        this.onTabSelect = callbacks.onTabSelect;
        this.onTabClose = callbacks.onTabClose;
        this.onTabRename = callbacks.onTabRename;
        this.onNewTab = callbacks.onNewTab;
    }

    render(projects, activeIndex) {
        this.container.innerHTML = '';

        projects.forEach((project, index) => {
            const tab = document.createElement('div');
            tab.className = 'tab' + (index === activeIndex ? ' active' : '');

            const name = document.createElement('span');
            name.className = 'tab-name';
            name.textContent = project.name + (project.modified ? ' *' : '');
            name.addEventListener('click', () => this.onTabSelect(index));
            name.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                this._startRename(name, index);
            });

            const closeBtn = document.createElement('span');
            closeBtn.className = 'tab-close';
            closeBtn.textContent = '\u00d7';
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.onTabClose(index);
            });

            tab.appendChild(name);
            tab.appendChild(closeBtn);
            this.container.appendChild(tab);
        });

        const addTab = document.createElement('div');
        addTab.className = 'tab tab-add';
        addTab.textContent = '+';
        addTab.addEventListener('click', () => this.onNewTab());
        this.container.appendChild(addTab);
    }

    _startRename(element, index) {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'tab-rename-input';
        input.value = element.textContent.replace(' *', '');

        element.replaceWith(input);
        input.focus();
        input.select();

        const finish = () => {
            const newName = input.value.trim();
            if (newName) {
                this.onTabRename(index, newName);
            }
        };

        input.addEventListener('blur', finish);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') input.blur();
            if (e.key === 'Escape') this.onTabSelect(index);
        });
    }
}
