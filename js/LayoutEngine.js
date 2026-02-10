class LayoutEngine {
    constructor(pageWidth, pageHeight) {
        this.pageWidth = pageWidth;
        this.pageHeight = pageHeight;
        this.gap = 10;
        this.dateAreaHeight = 30;
    }

    positionAll(project) {
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

        var currentX = 0;
        var currentY = 0;
        var rowHeight = 0;
        var currentPage = project.addPage();
        var self = this;

        allScreenshots.forEach(function (screenshot) {
            var itemHeight = screenshot.height + self.dateAreaHeight;

            if (currentX + screenshot.width > self.pageWidth && currentX > 0) {
                currentX = 0;
                currentY += rowHeight + self.gap;
                rowHeight = 0;
            }

            if (currentY + itemHeight > self.pageHeight && currentY > 0) {
                currentPage = project.addPage();
                currentX = 0;
                currentY = 0;
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
