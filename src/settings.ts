import { App, PluginSettingTab, Setting } from 'obsidian'
import OpenMyNotePlugin from './main'

export interface SettingsInterface {
  notePath: string
}

export const DEFAULT_SETTINGS: SettingsInterface = {
  notePath: 'the note.md',
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
    containerEl.createEl('h2', { text: 'Open My Favorite Note Settings' })

    new Setting(containerEl)
      .setName('Note Path')
      .setDesc(
        "Enter the exact path to the note you want to open (e.g., 'Folder/Note.md')",
      )
      .addText((text) =>
        text
          .setPlaceholder('MyNotes/FavoriteNote.md')
          .setValue(this.plugin.settings.notePath)
          .onChange(async (value) => {
            this.plugin.settings.notePath = value
            await this.plugin.saveSettings()
          }),
      )
  }
}
