class ProjectManager {
    constructor() {
        this.projects = [];
        this.activeIndex = -1;
    }

    addProject(project) {
        this.projects.push(project);
        this.activeIndex = this.projects.length - 1;
        return this.activeIndex;
    }

    removeProject(index) {
        if (index < 0 || index >= this.projects.length) return;
        this.projects.splice(index, 1);
        if (this.projects.length === 0) {
            this.activeIndex = -1;
        } else if (this.activeIndex >= this.projects.length) {
            this.activeIndex = this.projects.length - 1;
        }
    }

    getActive() {
        if (this.activeIndex >= 0 && this.activeIndex < this.projects.length) {
            return this.projects[this.activeIndex];
        }
        return null;
    }

    setActive(index) {
        if (index >= 0 && index < this.projects.length) {
            this.activeIndex = index;
        }
    }
}
