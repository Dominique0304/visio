class DragManager {
    constructor(onDragEnd) {
        this.isDragging = false;
        this.currentElement = null;
        this.currentScreenshot = null;
        this.offsetX = 0;
        this.offsetY = 0;
        this.onDragEnd = onDragEnd;

        this._handleMouseMove = this._handleMouseMove.bind(this);
        this._handleMouseUp = this._handleMouseUp.bind(this);
    }

    startDrag(event, element, screenshot) {
        event.preventDefault();
        this.isDragging = true;
        this.currentElement = element;
        this.currentScreenshot = screenshot;

        var rect = element.getBoundingClientRect();
        this.offsetX = event.clientX - rect.left;
        this.offsetY = event.clientY - rect.top;

        element.classList.add('dragging');

        document.addEventListener('mousemove', this._handleMouseMove);
        document.addEventListener('mouseup', this._handleMouseUp);
    }

    _handleMouseMove(event) {
        if (!this.isDragging) return;

        var canvas = document.getElementById('page-canvas');
        var canvasRect = canvas.getBoundingClientRect();
        var scale = parseFloat(canvas.dataset.scale) || 1;

        var newX = (event.clientX - canvasRect.left - this.offsetX) / scale;
        var newY = (event.clientY - canvasRect.top - this.offsetY) / scale;

        this.currentElement.style.left = newX + 'px';
        this.currentElement.style.top = newY + 'px';

        this.currentScreenshot.x = Math.round(newX);
        this.currentScreenshot.y = Math.round(newY);
    }

    _handleMouseUp() {
        if (!this.isDragging) return;

        this.isDragging = false;
        this.currentElement.classList.remove('dragging');

        document.removeEventListener('mousemove', this._handleMouseMove);
        document.removeEventListener('mouseup', this._handleMouseUp);

        if (this.onDragEnd) {
            this.onDragEnd(this.currentScreenshot);
        }

        this.currentElement = null;
        this.currentScreenshot = null;
    }
}
