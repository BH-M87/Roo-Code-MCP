import fs from "fs-extra"
import path from "path"
import glob from "glob"
import { ToolHandler } from "./types"

/**
 * 列出文件工具
 * @param params 工具参数
 * @returns 工具执行结果
 */
export const listFilesTool: ToolHandler = async ({ toolUse, cwd, verbose }) => {
	const { params } = toolUse
	const relDirPath = params.path
	const recursive = params.recursive === "true"

	if (!relDirPath) {
		return 'Error: Missing required parameter "path"'
	}

	try {
		// 解析目录路径
		const fullPath = path.resolve(cwd, relDirPath)

		if (verbose) {
			console.log(`Listing files in directory: ${fullPath}`)
			console.log(`Recursive: ${recursive}`)
		}

		// 检查目录是否存在
		if (!(await fs.pathExists(fullPath))) {
			return `Error: Directory not found: ${relDirPath}`
		}

		// 检查是否是目录
		const stats = await fs.stat(fullPath)
		if (!stats.isDirectory()) {
			return `Error: Not a directory: ${relDirPath}`
		}

		// 列出文件
		const pattern = recursive ? "**/*" : "*"
		const options = {
			cwd: fullPath,
			dot: true,
			nodir: false,
		}

		// 使用回调方式调用 glob
		const files = await new Promise<string[]>((resolve, reject) => {
			glob(pattern, options, (err, matches) => {
				if (err) {
					reject(err)
				} else {
					resolve(matches)
				}
			})
		})

		// 构建结果
		let result = `Directory: ${relDirPath}\n`
		result += `Total items: ${files.length}\n\n`

		// 按类型分组
		const directories: string[] = []
		const regularFiles: string[] = []

		for (const file of files) {
			const filePath = path.join(fullPath, file)
			const fileStat = await fs.stat(filePath)

			if (fileStat.isDirectory()) {
				directories.push(file + "/")
			} else {
				regularFiles.push(file)
			}
		}

		// 添加目录
		if (directories.length > 0) {
			result += "Directories:\n"
			directories.sort().forEach((dir) => {
				result += `- ${dir}\n`
			})
			result += "\n"
		}

		// 添加文件
		if (regularFiles.length > 0) {
			result += "Files:\n"
			regularFiles.sort().forEach((file) => {
				result += `- ${file}\n`
			})
		}

		return result
	} catch (error) {
		console.error(`Error listing files in directory ${relDirPath}:`, error)
		return `Error listing files in directory ${relDirPath}: ${error instanceof Error ? error.message : String(error)}`
	}
}
