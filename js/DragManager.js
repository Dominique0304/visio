class DragManager {
    constructor(onDragEnd, onDragStart) {
        this.isDragging = false;
        this.hasMoved = false;
        this.startMouseX = 0;
        this.startMouseY = 0;
        this.groupItems = [];
        this.onDragEnd = onDragEnd;
        this.onDragStart = onDragStart;

        this._handleMouseMove = this._handleMouseMove.bind(this);
        this._handleMouseUp = this._handleMouseUp.bind(this);
    }

    startDrag(event, items) {
        event.preventDefault();
        this.isDragging = true;
        this.hasMoved = false;
        this.startMouseX = event.clientX;
        this.startMouseY = event.clientY;

        this.groupItems = items.map(function (item) {
            return {
                element: item.element,
                screenshot: item.screenshot,
                startX: item.screenshot.x,
                startY: item.screenshot.y
            };
        });

        this.groupItems.forEach(function (item) {
            item.element.classList.add('dragging');
        });

        document.addEventListener('mousemove', this._handleMouseMove);
        document.addEventListener('mouseup', this._handleMouseUp);
    }

    _handleMouseMove(event) {
        if (!this.isDragging) return;

        if (!this.hasMoved) {
            this.hasMoved = true;
            if (this.onDragStart) {
                this.onDragStart();
            }
        }

        var canvas = document.getElementById('page-canvas');
        var scale = parseFloat(canvas.dataset.scale) || 1;

        var dx = (event.clientX - this.startMouseX) / scale;
        var dy = (event.clientY - this.startMouseY) / scale;

        this.groupItems.forEach(function (item) {
            var newX = item.startX + dx;
            var newY = item.startY + dy;
            item.element.style.left = newX + 'px';
            item.element.style.top = newY + 'px';
            item.screenshot.x = Math.round(newX);
            item.screenshot.y = Math.round(newY);
        });
    }

    _handleMouseUp() {
        if (!this.isDragging) return;

        this.isDragging = false;
        this.groupItems.forEach(function (item) {
            item.element.classList.remove('dragging');
        });

        document.removeEventListener('mousemove', this._handleMouseMove);
        document.removeEventListener('mouseup', this._handleMouseUp);

        if (this.onDragEnd) {
            this.onDragEnd();
        }

        this.groupItems = [];
    }
}
