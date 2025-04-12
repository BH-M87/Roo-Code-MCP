import fs from "fs-extra"
import path from "path"
import glob from "glob"
import { ToolHandler } from "./types"

/**
 * 搜索文件工具
 * @param params 工具参数
 * @returns 工具执行结果
 */
export const searchFilesTool: ToolHandler = async ({ toolUse, cwd, verbose }) => {
	const { params } = toolUse
	const relDirPath = params.path
	const regex = params.regex
	const filePattern = params.file_pattern

	if (!relDirPath) {
		return 'Error: Missing required parameter "path"'
	}

	if (!regex) {
		return 'Error: Missing required parameter "regex"'
	}

	try {
		// 解析目录路径
		const fullPath = path.resolve(cwd, relDirPath)

		if (verbose) {
			console.log(`Searching files in directory: ${fullPath}`)
			console.log(`Regex: ${regex}`)
			console.log(`File pattern: ${filePattern || "*"}`)
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

		// 编译正则表达式
		let regexObj: RegExp
		try {
			regexObj = new RegExp(regex, "g")
		} catch (error) {
			return `Error: Invalid regular expression: ${regex}`
		}

		// 获取文件列表
		const pattern = filePattern || "**/*"
		const options = {
			cwd: fullPath,
			dot: true,
			nodir: true,
			ignore: ["**/node_modules/**", "**/dist/**", "**/build/**", "**/.git/**"],
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

		// 搜索文件
		const results: Array<{ file: string; line: number; content: string; match: string }> = []

		for (const file of files) {
			const filePath = path.join(fullPath, file)

			try {
				// 检查是否是二进制文件
				const isBinary = await new Promise<boolean>((resolve) => {
					fs.readFile(filePath, (err, data) => {
						if (err) {
							resolve(true) // 如果读取出错，假设是二进制文件
						} else {
							// 简单检查是否包含空字节
							resolve(data.includes(0))
						}
					})
				})

				if (isBinary) {
					continue
				}

				const content = await fs.readFile(filePath, "utf-8")
				const lines = content.split("\n")

				for (let i = 0; i < lines.length; i++) {
					const line = lines[i]
					const matches = [...line.matchAll(regexObj)]

					if (matches.length > 0) {
						for (const match of matches) {
							results.push({
								file,
								line: i + 1,
								content: line,
								match: match[0],
							})
						}
					}
				}
			} catch (error) {
				console.error(`Error searching file ${file}:`, error)
				// 继续搜索其他文件
			}
		}

		// 构建结果
		let result = `Search results for "${regex}" in ${relDirPath}`
		if (filePattern) {
			result += ` (pattern: ${filePattern})`
		}
		result += `\n\nFound ${results.length} matches in ${files.length} files:\n\n`

		if (results.length === 0) {
			result += "No matches found."
		} else {
			// 按文件分组
			const fileGroups: Record<string, typeof results> = {}

			for (const item of results) {
				if (!fileGroups[item.file]) {
					fileGroups[item.file] = []
				}
				fileGroups[item.file].push(item)
			}

			// 输出结果
			for (const file in fileGroups) {
				result += `File: ${file}\n`

				for (const item of fileGroups[file]) {
					result += `  Line ${item.line}: ${item.content.trim()}\n`
				}

				result += "\n"
			}
		}

		return result
	} catch (error) {
		console.error(`Error searching files in directory ${relDirPath}:`, error)
		return `Error searching files in directory ${relDirPath}: ${error instanceof Error ? error.message : String(error)}`
	}
}
