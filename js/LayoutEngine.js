class LayoutEngine {
    constructor(pageWidth, pageHeight, pageMargin) {
        this.pageWidth = pageWidth;
        this.pageHeight = pageHeight;
        this.margin = pageMargin || 0;
        this.gap = 10;
        this.dateAreaHeight = 30;
    }

    positionAll(project, referencePoint) {
        var allScreenshots = [];
        project.pages.forEach(function (page) {
            page.screenshots.forEach(function (s) {
                allScreenshots.push(s);
            });
        });

        if (allScreenshots.length === 0) return;

        allScreenshots.forEach(function (s) {
            s.resize(project.imageHeight);
        });

        project.pages = [];

        var startX = referencePoint ? referencePoint.x : this.margin;
        var startY = referencePoint ? referencePoint.y : this.margin;
        var rowStartX = referencePoint ? referencePoint.rowStartX : this.margin;
        var maxX = this.pageWidth - this.margin;
        var maxY = this.pageHeight - this.margin;

        var currentX = startX;
        var currentY = startY;
        var rowHeight = 0;
        var currentPage = project.addPage();
        var self = this;

        allScreenshots.forEach(function (screenshot) {
            var itemHeight = screenshot.height + self.dateAreaHeight;

            if (currentX + screenshot.width > maxX && currentX > rowStartX) {
                currentX = rowStartX;
                currentY += rowHeight + self.gap;
                rowHeight = 0;
            }

            if (currentY + itemHeight > maxY && currentY > self.margin) {
                currentPage = project.addPage();
                currentX = self.margin;
                currentY = self.margin;
                rowStartX = self.margin;
                rowHeight = 0;
            }

            screenshot.x = currentX;
            screenshot.y = currentY;
            screenshot.positioned = true;

            currentPage.addScreenshot(screenshot);

            currentX += screenshot.width + self.gap;
            rowHeight = Math.max(rowHeight, itemHeight);
        });

        project.currentPageIndex = 0;
    }
}
