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
        const heightUnit = document.createElement('span');
        heightUnit.textContent = ' px';

        heightLabel.appendChild(heightInput);
        heightLabel.appendChild(heightUnit);
        configSection.appendChild(heightLabel);

        const zoomLabel = document.createElement('label');
        zoomLabel.textContent = 'Zoom : ';
        const zoomSelect = document.createElement('select');
        zoomSelect.id = 'zoom-select';
        [25, 50, 75, 100, 125, 150].forEach(z => {
            const opt = document.createElement('option');
            opt.value = z;
            opt.textContent = z + '%';
            if (z === 50) opt.selected = true;
            zoomSelect.appendChild(opt);
        });
        zoomSelect.addEventListener('change', (e) => {
            this.callbacks.onZoomChange(parseInt(e.target.value));
        });
        zoomLabel.appendChild(zoomSelect);
        configSection.appendChild(zoomLabel);

        this.container.appendChild(configSection);
    }

    updateHeight(value) {
        const input = document.getElementById('image-height-input');
        if (input) input.value = value;
    }

    updateZoom(value) {
        const select = document.getElementById('zoom-select');
        if (select) select.value = value;
    }
}
