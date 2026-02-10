class Page {
    constructor({ pageNumber, screenshots }) {
        this.pageNumber = pageNumber || 1;
        this.screenshots = (screenshots || []).map(
            s => s instanceof Screenshot ? s : Screenshot.fromJSON(s)
        );
    }

    addScreenshot(screenshot) {
        this.screenshots.push(screenshot);
    }

    removeScreenshot(id) {
        this.screenshots = this.screenshots.filter(s => s.id !== id);
    }

    getScreenshot(id) {
        return this.screenshots.find(s => s.id === id);
    }

    toJSON() {
        return {
            pageNumber: this.pageNumber,
            screenshots: this.screenshots.map(s => s.toJSON())
        };
    }

    static fromJSON(data) {
        return new Page(data);
    }
}
