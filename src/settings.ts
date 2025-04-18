import { App, PluginSettingTab, Setting } from 'obsidian'
import OpenMyNotePlugin from './main'

export interface SettingsInterface {
  notes: string[]
  numNotes: number
}

export const DEFAULT_SETTINGS: SettingsInterface = {
  notes: [],
  numNotes: 10,
}

export class SettingsTab extends PluginSettingTab {
  plugin: OpenMyNotePlugin

  constructor(app: App, plugin: OpenMyNotePlugin) {
    super(app, plugin)
    this.plugin = plugin
  }

  display(): void {
    const { containerEl } = this

    containerEl.empty()
    containerEl.createEl('h1', { text: 'Open Specific Notes' })
    containerEl.createEl('p', {
      text: "Enter the exact path relative to the Obsidian Vault (e.g., 'target-note.md')",
    })

    for (let i = 0; i < this.plugin.settings.numNotes; i++) {
      new Setting(containerEl).setName(`Note #${i}`).addText((text) =>
        text
          .setPlaceholder('target-note.md')
          .setValue(this.plugin.settings.notes[i] || '')
          .onChange(async (value) => {
            if (!value) return
            this.plugin.settings.notes[i] = value
            await this.plugin.saveSettings()
          }),
      )
    }
  }
}
