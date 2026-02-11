class Toolbar {
    constructor(container, callbacks) {
        this.container = container;
        this.callbacks = callbacks;
        this._render();
    }

    _render() {
        this.container.innerHTML = '';

        const buttons = [
            { label: 'Nouveau', action: 'onNew' },
            { label: 'Ouvrir', action: 'onOpen' },
            { label: 'Enregistrer', action: 'onSave' },
            { label: 'Positionnement', action: 'onPosition', className: 'btn-position' },
            { label: 'Initialiser', action: 'onInitialize', className: 'btn-initialize' },
            { label: 'R\u00e9organisation', action: 'onReorganize', className: 'btn-reorganize' },
        ];

        const btnGroup = document.createElement('div');
        btnGroup.className = 'toolbar-buttons';

        buttons.forEach(btn => {
            const button = document.createElement('button');
            button.className = 'toolbar-btn' + (btn.className ? ' ' + btn.className : '');
            button.textContent = btn.label;
            button.addEventListener('click', () => this.callbacks[btn.action]());
            btnGroup.appendChild(button);
        });

        this.container.appendChild(btnGroup);

        const configSection = document.createElement('div');
        configSection.className = 'toolbar-config';

        const heightLabel = document.createElement('label');
        heightLabel.textContent = 'Hauteur images : ';
        const heightInput = document.createElement('input');
        heightInput.type = 'number';
        heightInput.id = 'image-height-input';
        heightInput.min = 50;
        heightInput.max = 1000;
        heightInput.value = 200;
        heightInput.addEventListener('change', (e) => {
            this.callbacks.onHeightChange(parseInt(e.target.value));
        });
        heightInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' || e.key === 'Enter') e.target.blur();
        });
        const heightUnit = document.createElement('span');
        heightUnit.textContent = ' px';

        heightLabel.appendChild(heightInput);
        heightLabel.appendChild(heightUnit);
        configSection.appendChild(heightLabel);

        const zoomLabel = document.createElement('label');
        zoomLabel.textContent = 'Zoom : ';
        const zoomInput = document.createElement('input');
        zoomInput.type = 'number';
        zoomInput.id = 'zoom-input';
        zoomInput.min = 10;
        zoomInput.max = 300;
        zoomInput.value = 50;
        zoomInput.addEventListener('change', (e) => {
            var val = Math.max(10, Math.min(300, parseInt(e.target.value) || 50));
            e.target.value = val;
            this.callbacks.onZoomChange(val);
        });
        zoomInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' || e.key === 'Enter') e.target.blur();
        });
        const zoomUnit = document.createElement('span');
        zoomUnit.textContent = ' %';
        zoomLabel.appendChild(zoomInput);
        zoomLabel.appendChild(zoomUnit);
        configSection.appendChild(zoomLabel);

        this.container.appendChild(configSection);

        var statusSection = document.createElement('div');
        statusSection.className = 'toolbar-status';
        statusSection.id = 'reference-status';
        statusSection.style.display = 'none';
        statusSection.textContent = 'Ref. active';
        this.container.appendChild(statusSection);
    }

    showReferenceStatus(active) {
        var status = document.getElementById('reference-status');
        if (status) {
            status.style.display = active ? 'inline-block' : 'none';
        }
    }

    updateHeight(value) {
        const input = document.getElementById('image-height-input');
        if (input) input.value = value;
    }

    updateZoom(value) {
        var input = document.getElementById('zoom-input');
        if (input) input.value = value;
    }
}
