import {
    App,
    FuzzySuggestModal,
    Notice,
    Plugin,
    TFile,
    TFolder,
    getAllTags,
} from 'obsidian'
import {
    DEFAULT_SETTINGS,
    FNOSettingTab,
    SettingsFNO,
    createNoteFilterSetInputs,
    createSettingsNoteFilterSets,
} from './settings'
import { NotePicker, pickers } from './pickers'
import { NoteFilterSet, FilterSet } from 'src'

export default class OpenMyNotePlugin extends Plugin {
	async onload() {
		this.addCommand({
			id: "open-my-favorite-note",
			name: "Open My Favorite Note",
			callback: async () => {
				const file = this.app.vault.getAbstractFileByPath("path/to/YourNote.md");
				if (file && file instanceof this.app.vault.constructor.TFile) {
					this.app.workspace.getLeaf(true).openFile(file);
				} else {
					new Notice("Note not found.");
				}
			},
		});
	}
}

class FilterSetSuggestModal<T extends FilterSet> extends FuzzySuggestModal<T> {
    constructor(app: App, items: T[], callback: (item: T) => void) {
        super(app)
        this.items = items
        this.callback = callback
    }

    items: T[]
    callback: (item: T) => void

    getItems(): T[] {
        return this.items
    }

    getItemText(item: T): string {
        return `${item.name}`
    }
    onChooseItem(item: T, evt: MouseEvent | KeyboardEvent): void {
        this.callback(item)
    }
}

export async function choseFilterSet<T extends FilterSet>(
    FilterSets: T[],
): Promise<T> {
    return new Promise((resolve, rejects) => {
        new FilterSetSuggestModal<T>(this.app, FilterSets, resolve).open()
    })
}


class FnOPlugin extends Plugin {
    settings: SettingsFNO

    pickers: NotePicker[] = pickers

    api_getNote: () => Promise<TFile>
    api_createSettingsNoteFilterSets: (
        containerEl: HTMLElement,
        filterSets: NoteFilterSet[],
        saveFilterSets: (sets: NoteFilterSet[]) => Promise<void> | void,
        refreshDisplay: () => void,
    ) => void
    api_createNoteFilterSetInputs: (
        containerEl: HTMLElement,
        filterSet: NoteFilterSet,
        description: string,
        deletable: boolean,
        renamable: boolean,
        validateSetName: (name: string, notify: boolean) => boolean,
        saveSet: (set: NoteFilterSet | null) => Promise<void> | void,
        refreshDisplay: () => void,
    ) => void

    async onload() {
        await this.loadSettings()
        ;(this.api_getNote = this.getNote),
            (this.api_createSettingsNoteFilterSets =
                createSettingsNoteFilterSets)
        this.api_createNoteFilterSetInputs = createNoteFilterSetInputs

        // add a command to trigger the project note opener
        this.addCommand({
            id: 'pick-note',
            name: 'Pick note',
            callback: async () => {
                if (this.settings.noteFilterSets.length == 0) {
                    new Notice('Error: no note filter sets defined')
                    return
                }

                const noteFilterSet =
                    this.settings.noteFilterSets.length === 1
                        ? this.settings.noteFilterSets[0]
                        : await choseFilterSet(this.settings.noteFilterSets)

                const note = await this.getNote(noteFilterSet)
                this.app.workspace.getLeaf(true).openFile(note)
            },
        })

        this.createFilterSetCommands()

        // This adds a settings tab so the user can configure various aspects of the plugin
        this.addSettingTab(new FNOSettingTab(this.app, this))
    }

    onunload() {}

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

    public getNote(
        noteFilterSet: string | NoteFilterSet = DEFAULT_NOTE_FILTER_SET,
    ): Promise<TFile> {
        return new Promise((resolve, reject) => {
            if (typeof noteFilterSet === 'string') {
                const noteFilterSetOfName = this.settings.noteFilterSets.find(
                    (set) => set.name === noteFilterSet,
                )
                if (!noteFilterSetOfName) {
                    new Notice(
                        `Error: Note Filter Set "${noteFilterSet}" does not exist`,
                    )
                    return reject(null)
                }
                noteFilterSet = noteFilterSetOfName
            }

            const filteredNotes: TFile[] = filterNoteList(
                noteFilterSet,
                this.app.vault.getFiles(),
            )
            if (filteredNotes.length === 0) {
                new Notice(
                    `Error: No notes match filter set "${noteFilterSet.name}"`,
                )
                return reject(
                    `No notes match filter set "${noteFilterSet.name}"`,
                )
            }

            if (filteredNotes.length === 1) {
                return resolve(filteredNotes[0])
            }

            const nearestNotesInSet = getNearestNotesInSet(
                this.app.workspace.getActiveFile()?.parent || null,
                noteFilterSet,
            )

            for (let note of nearestNotesInSet) {
                filteredNotes.remove(note)
                filteredNotes.unshift(note)
            }

            this.pickers[this.settings.pickerIndex].pick(
                this.app,
                filteredNotes,
                (file) => resolve(file),
            )
        })
    }

    createFilterSetCommands() {
        for (let noteSet of this.settings.noteFilterSets) {
            const normalizedSetName = noteSet.name
                .toLowerCase()
                .replaceAll(/[^\w\s]/g, '')
                .replace(/\s+/g, ' ')
                .replace(/\s/g, '-')

            this.addCommand({
                id: `open-${normalizedSetName}-note`,
                name: `Open ${noteSet.name} Note`,
                callback: async () => {
                    const note = await this.getNote(noteSet)
                    this.openNote(note)
                },
            })
        }
    }

    openNote(note: TFile) {
        if (!note) return
        this.app.workspace.getLeaf(true).openFile(note)
    }
}

function getNearestNotesInSet(
    parent: TFolder | null,
    noteFilterSet: NoteFilterSet,
): TFile[] {
    if (!parent) return []

    const siblings = parent.children
    if (siblings && siblings[0]) {
        const filteredSiblings = filterNoteList(
            noteFilterSet,
            siblings.flatMap((f) => (f instanceof TFile ? [f] : [])),
        )
        if (filteredSiblings.length > 0) {
            filteredSiblings.reverse()
            return filteredSiblings
        }

        return getNearestNotesInSet(parent.parent, noteFilterSet)
    }

    return []
}

function getRegexIfValid(str: string): null | RegExp {
    const regexPattern = /^\/(.*)\/([gimuy]*)$/
    const match = str.match(regexPattern)

    if (!match) {
        return null
    }

    const [, pattern, flags] = match

    try {
        return new RegExp(pattern, flags)
    } catch (e) {
        return null
    }
}

function filterNoteList(settings: NoteFilterSet, list: TFile[]): TFile[] {
    if (settings.includePathName) {
        const includePathNameRegExp = getRegexIfValid(settings.includePathName)
        if (includePathNameRegExp) {
            list = list.filter((f) => f.path.match(includePathNameRegExp))
        } else {
            list = list.filter((f) => f.path.includes(settings.includePathName))
        }
    }

    if (settings.includeNoteName) {
        const includeNoteNameRegExp = getRegexIfValid(settings.includeNoteName)
        if (includeNoteNameRegExp) {
            list = list.filter((f) => f.name.match(includeNoteNameRegExp))
        } else {
            list = list.filter((f) => f.name.includes(settings.includeNoteName))
        }
    }

    if (settings.excludePathName) {
        const excludePathNameRegExp = getRegexIfValid(settings.excludePathName)
        if (excludePathNameRegExp) {
            list = list.filter((f) => !f.path.match(excludePathNameRegExp))
        } else {
            list = list.filter(
                (f) => !f.path.includes(settings.excludePathName),
            )
        }
    }

    if (settings.excludeNoteName) {
        const excludeNoteNameRegExp = getRegexIfValid(settings.excludeNoteName)
        if (excludeNoteNameRegExp) {
            list = list.filter((f) => !f.name.match(settings.excludeNoteName))
        } else {
            list = list.filter(
                (f) => !f.name.includes(settings.excludeNoteName),
            )
        }
    }

    if (settings.includeTags) {
        const includeTagRegExp = getRegexIfValid(settings.includeTags)
        if (includeTagRegExp) {
            list = list.filter((f) => {
                const fCache = app.metadataCache.getFileCache(f)
                if (!fCache) return false

                return getAllTags(fCache)?.some((t) =>
                    t.match(includeTagRegExp),
                )
            })
        } else {
            const includeTags = settings.includeTags.split(/\s*,\s*/)

            list = list.filter((f) => {
                const fCache = app.metadataCache.getFileCache(f)
                if (!fCache) return false

                const fTags = getAllTags(fCache)
                if (!fTags) return false

                return includeTags.every((it) =>
                    fTags.some((t) => t.startsWith(it)),
                )
            })
        }
    }

    if (settings.excludeTags) {
        const excludeTagRegExp = getRegexIfValid(settings.excludeTags)
        if (excludeTagRegExp) {
            list = list.filter((f) => {
                const fCache = app.metadataCache.getFileCache(f)
                if (!fCache) return true

                return !getAllTags(fCache)?.some((t) =>
                    t.match(excludeTagRegExp),
                )
            })
        } else {
            const excludeTags = settings.excludeTags.split(/\s*,\s*/)

            list = list.filter((f) => {
                const fCache = app.metadataCache.getFileCache(f)
                if (!fCache) return true

                const fTags = getAllTags(fCache)
                if (!fTags) return true

                return !excludeTags.some((et) =>
                    fTags.some((t) => t.startsWith(et)),
                )
            })
        }
    }

    return list
}
