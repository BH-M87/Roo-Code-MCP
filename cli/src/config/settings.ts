import fs from "fs-extra"
import path from "path"
import { TaskConfig, ProviderProfile, GlobalSettings, CustomMode } from "../types"

// Default file names
const DEFAULT_TASK_FILE = ".rooTask"
const DEFAULT_PROVIDER_FILE = ".rooProviderProfiles"
const DEFAULT_SETTINGS_FILE = ".rooSettings"
const DEFAULT_MODES_FILE = ".rooModes"

/**
 * Read a JSON file and parse its contents
 * @param filePath Path to the JSON file
 * @returns Parsed JSON content or null if file doesn't exist
 */
async function readJsonFile<T>(filePath: string): Promise<T | null> {
	try {
		if (await fs.pathExists(filePath)) {
			const content = await fs.readFile(filePath, "utf-8")
			return JSON.parse(content) as T
		}
		return null
	} catch (error) {
		console.error(`Error reading file ${filePath}:`, error)
		return null
	}
}

/**
 * Read task configuration from file
 * @param filePath Path to the task configuration file
 * @returns Task configuration or null if file doesn't exist
 */
export async function readTaskConfig(filePath: string = DEFAULT_TASK_FILE): Promise<TaskConfig | null> {
	return readJsonFile<TaskConfig>(filePath)
}

/**
 * Read provider profiles from file
 * @param filePath Path to the provider profiles file
 * @returns Provider profiles or null if file doesn't exist
 */
export async function readProviderProfiles(filePath: string = DEFAULT_PROVIDER_FILE): Promise<ProviderProfile | null> {
	return readJsonFile<ProviderProfile>(filePath)
}

/**
 * Read global settings from file
 * @param filePath Path to the global settings file
 * @returns Global settings or null if file doesn't exist
 */
export async function readGlobalSettings(filePath: string = DEFAULT_SETTINGS_FILE): Promise<GlobalSettings | null> {
	return readJsonFile<GlobalSettings>(filePath)
}

/**
 * Read custom modes from file
 * @param filePath Path to the custom modes file
 * @returns Custom modes array or null if file doesn't exist
 */
export async function readCustomModes(filePath: string = DEFAULT_MODES_FILE): Promise<CustomMode[] | null> {
	return readJsonFile<CustomMode[]>(filePath)
}

/**
 * Merge custom modes from settings and modes file
 * @param settingsFile Path to the settings file
 * @param modesFile Path to the modes file
 * @returns Merged custom modes
 */
export async function getMergedCustomModes(settings: GlobalSettings | null, modesFile: string = DEFAULT_MODES_FILE) {
	const modes = await readCustomModes(modesFile)

	const settingsModes = settings?.customModes || []
	const filesModes = modes || []

	// Create a map of modes by slug for easy lookup and overriding
	const modesMap = new Map<string, CustomMode>()
	// Add settings modes first
	settingsModes.forEach((mode) => {
		modesMap.set(mode.slug, { ...mode })
	})

	// Override with file modes (they have higher priority)
	filesModes.forEach((mode) => {
		modesMap.set(mode.slug, { ...mode })
	})
	const customModes = Array.from(modesMap.values())
	if (settings) {
		// Convert map back to array
		settings.customModes = customModes
	}
	return customModes
}

/**
 * Save task configuration to file
 * @param config Task configuration
 * @param filePath Path to save the configuration
 */
export async function saveTaskConfig(config: TaskConfig, filePath: string = DEFAULT_TASK_FILE): Promise<void> {
	try {
		await fs.writeFile(filePath, JSON.stringify(config, null, 2), "utf-8")
	} catch (error) {
		console.error(`Error saving task config to ${filePath}:`, error)
		throw error
	}
}

/**
 * Get the current working directory or use the provided one
 * @param cwd Optional working directory
 * @returns Current working directory
 */
export function getCurrentWorkingDirectory(cwd?: string): string {
	return cwd || process.cwd()
}

/**
 * Resolve a file path relative to the current working directory
 * @param filePath File path to resolve
 * @param cwd Optional working directory
 * @returns Absolute file path
 */
export function resolveFilePath(filePath: string, cwd?: string): string {
	if (path.isAbsolute(filePath)) {
		return filePath
	}
	return path.resolve(getCurrentWorkingDirectory(cwd), filePath)
}
