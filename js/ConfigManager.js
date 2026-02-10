class ConfigManager {
    constructor() {
        this.defaults = {
            imageHeight: 200,
            pageWidth: 2480,
            pageHeight: 1754,
            pageMargin: 59,
        };
    }

    getDefault(key) {
        return this.defaults[key];
    }
}
