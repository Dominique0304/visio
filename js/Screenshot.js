class Screenshot {
    constructor({ id, imageData, originalWidth, originalHeight, date, x, y, width, height, positioned }) {
        this.id = id || this._generateId();
        this.imageData = imageData;
        this.originalWidth = originalWidth;
        this.originalHeight = originalHeight;
        this.date = date || this._formatDate(new Date());
        this.x = x || 0;
        this.y = y || 0;
        this.width = width || originalWidth;
        this.height = height || originalHeight;
        this.positioned = positioned || false;
    }

    _generateId() {
        return 'scr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    _formatDate(date) {
        const dd = String(date.getDate()).padStart(2, '0');
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const yyyy = date.getFullYear();
        return dd + '/' + mm + '/' + yyyy;
    }

    resize(targetHeight) {
        const ratio = this.originalWidth / this.originalHeight;
        this.height = targetHeight;
        this.width = Math.round(targetHeight * ratio);
    }

    toJSON() {
        return {
            id: this.id,
            imageData: this.imageData,
            originalWidth: this.originalWidth,
            originalHeight: this.originalHeight,
            date: this.date,
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
            positioned: this.positioned
        };
    }

    static fromJSON(data) {
        return new Screenshot(data);
    }
}
