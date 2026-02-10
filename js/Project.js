class Project {
    constructor({ name, pages, imageHeight, modified }) {
        this.name = name || 'Nouveau Projet';
        this.pages = (pages || [{ pageNumber: 1, screenshots: [] }]).map(
            p => p instanceof Page ? p : Page.fromJSON(p)
        );
        this.imageHeight = imageHeight || 200;
        this.currentPageIndex = 0;
        this.modified = modified || false;
        this.fileHandle = null;
    }

    getCurrentPage() {
        return this.pages[this.currentPageIndex];
    }

    addPage() {
        const newPage = new Page({ pageNumber: this.pages.length + 1, screenshots: [] });
        this.pages.push(newPage);
        return newPage;
    }

    removePage(index) {
        if (this.pages.length <= 1) return false;
        this.pages.splice(index, 1);
        this.pages.forEach((p, i) => p.pageNumber = i + 1);
        if (this.currentPageIndex >= this.pages.length) {
            this.currentPageIndex = this.pages.length - 1;
        }
        return true;
    }

    setCurrentPage(index) {
        if (index >= 0 && index < this.pages.length) {
            this.currentPageIndex = index;
        }
    }

    getTotalPages() {
        return this.pages.length;
    }

    markModified() {
        this.modified = true;
    }

    markSaved() {
        this.modified = false;
    }

    toJSON() {
        return {
            name: this.name,
            imageHeight: this.imageHeight,
            pages: this.pages.map(p => p.toJSON())
        };
    }

    static fromJSON(data) {
        return new Project(data);
    }
}
