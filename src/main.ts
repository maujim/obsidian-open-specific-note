import { Notice, Plugin, TFile } from 'obsidian'
import { SettingsTab, SettingsInterface, DEFAULT_SETTINGS } from './settings'

export default class OpenMyNotePlugin extends Plugin {
    settings: SettingsInterface

    async onload() {
        await this.loadSettings()

        this.addCommand({
            id: 'open-my-favorite-note',
            name: 'Open My Favorite Note',
            callback: async () => {
                const file = this.app.vault.getAbstractFileByPath(
                    this.settings.notePath,
                )
                if (file && file instanceof TFile) {
                    this.app.workspace.getLeaf(true).openFile(file)
                } else {
                    new Notice('Note not found at: ' + this.settings.notePath)
                }
            },
        })

        this.addSettingTab(new SettingsTab(this.app, this))
    }

    async loadSettings() {
        this.settings = Object.assign(
            {},
            DEFAULT_SETTINGS,
            await this.loadData(),
        )
    }

    async saveSettings() {
        await this.saveData(this.settings)
    }
}
