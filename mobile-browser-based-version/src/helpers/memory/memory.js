/**
 * Abstract class representing a memory
 */
export class Memory {
  constructor() {
    throw new Error('Class `Memory` cannot be instanciated.');
  }

  static async getWorkingModel() {
    throw new Error("Method 'getWorkingModel()' must be implemented.");
  }
  static async updateWorkingModel() {
    throw new Error("Method 'updateWorkingModel()' must be implemented.");
  }
  static async saveWorkingModel() {
    throw new Error("Method 'saveWorkingModel()' must be implemented.");
  }
  static async deleteSavedModel() {
    throw new Error("Method 'deleteSavedModel()' must be implemented.");
  }
  static async loadSavedModel() {
    throw new Error("Method 'loadSavedModel()' must be implemented.");
  }
  static async downloadSavedModel() {
    throw new Error("Method 'downloadSavedModel()' must be implemented.");
  }
}
