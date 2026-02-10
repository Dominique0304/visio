class PageNavigator {
    constructor(container, callbacks) {
        this.container = container;
        this.onPrev = callbacks.onPrev;
        this.onNext = callbacks.onNext;
        this.onAdd = callbacks.onAdd;
        this.onRemove = callbacks.onRemove;
    }

    render(currentPage, totalPages) {
        this.container.innerHTML = '';

        const prevBtn = document.createElement('button');
        prevBtn.textContent = '\u25c0';
        prevBtn.className = 'nav-btn';
        prevBtn.disabled = currentPage <= 1;
        prevBtn.addEventListener('click', () => this.onPrev());

        const info = document.createElement('span');
        info.className = 'page-info';
        info.textContent = 'Page ' + currentPage + ' / ' + totalPages;

        const nextBtn = document.createElement('button');
        nextBtn.textContent = '\u25b6';
        nextBtn.className = 'nav-btn';
        nextBtn.disabled = currentPage >= totalPages;
        nextBtn.addEventListener('click', () => this.onNext());

        const addBtn = document.createElement('button');
        addBtn.textContent = '+ Page';
        addBtn.className = 'nav-btn nav-add';
        addBtn.addEventListener('click', () => this.onAdd());

        const removeBtn = document.createElement('button');
        removeBtn.textContent = '- Page';
        removeBtn.className = 'nav-btn nav-remove';
        removeBtn.disabled = totalPages <= 1;
        removeBtn.addEventListener('click', () => this.onRemove());

        this.container.appendChild(prevBtn);
        this.container.appendChild(info);
        this.container.appendChild(nextBtn);
        this.container.appendChild(addBtn);
        this.container.appendChild(removeBtn);
    }
}
