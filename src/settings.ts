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
    containerEl.createEl('h1', { text: 'Open Specific Notes' })
    containerEl.createEl('p', {
      text: "Enter the exact path relative to the Obsidian Vault (e.g., 'target-note.md')",
    })

    new Setting(containerEl)
      .setName('Note #1')
      .addText((text) =>
        text
          .setPlaceholder('target-note.md')
          .setValue(this.plugin.settings.notePath)
          .onChange(async (value) => {
            this.plugin.settings.notePath = value
            await this.plugin.saveSettings()
          }),
      )
  }
}
