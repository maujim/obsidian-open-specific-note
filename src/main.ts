import { Notice, Plugin, TFile } from 'obsidian'
import { SettingsTab, SettingsInterface, DEFAULT_SETTINGS } from './settings'

export default class OpenMyNotePlugin extends Plugin {
  settings: SettingsInterface

  async onload() {
    await this.loadSettings()

    for (let i = 0; i < this.settings.numNotes; i++) {
      if (!this.settings.notes[i]) continue

      const note_name = this.settings.notes[i]

      this.addCommand({
        id: `open-note-${i}`,
        name: `${i}: ${note_name}`,
        callback: async () => {
          const file = this.app.vault.getAbstractFileByPath(
            this.settings.notes[i],
          )
          if (file && file instanceof TFile) {
            this.app.workspace.getLeaf(true).openFile(file)
          } else {
            new Notice('Note not found at: ' + this.settings.notes[i])
          }
        },
      })
    }

    this.addSettingTab(new SettingsTab(this.app, this))
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
  }

  async saveSettings() {
    await this.saveData(this.settings)
  }
}
