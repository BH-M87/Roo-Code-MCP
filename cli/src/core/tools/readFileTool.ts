import fs from "fs-extra"
import path from "path"
import { ToolHandler, ToolResponse } from "./types"
import { isBinaryFile } from "isbinaryfile/lib/index"

/**
 * 读取文件工具
 * @param params 工具参数
 * @returns 工具执行结果
 */
export const readFileTool: ToolHandler = async ({ toolUse, cwd, verbose }) => {
	const { params } = toolUse
	const relPath = params.path
	const startLineStr = params.start_line
	const endLineStr = params.end_line

	if (!relPath) {
		return 'Error: Missing required parameter "path"'
	}

	try {
		// 解析文件路径
		const fullPath = path.resolve(cwd, relPath)

		if (verbose) {
			console.log(`Reading file: ${fullPath}`)
		}

		// 检查文件是否存在
		if (!(await fs.pathExists(fullPath))) {
			return `Error: File not found: ${relPath}`
		}

		// 检查是否是二进制文件
		const isBinary = await isBinaryFile(fullPath)
		if (isBinary) {
			return `Error: Cannot read binary file: ${relPath}`
		}

		// 解析行范围
		const startLine = startLineStr ? parseInt(startLineStr, 10) - 1 : undefined
		const endLine = endLineStr ? parseInt(endLineStr, 10) - 1 : undefined
		const isRangeRead = startLine !== undefined || endLine !== undefined

		// 读取文件内容
		const fileContent = await fs.readFile(fullPath, "utf-8")
		const lines = fileContent.split("\n")

		// 计算总行数
		const totalLines = lines.length

		// 根据行范围读取内容
		let content: string
		if (isRangeRead) {
			const start = startLine !== undefined ? Math.max(0, startLine) : 0
			const end = endLine !== undefined ? Math.min(totalLines - 1, endLine) : totalLines - 1

			if (start > end) {
				const startLineNum = startLine !== undefined ? startLine + 1 : 1
				const endLineNum = endLine !== undefined ? endLine + 1 : totalLines
				return `Error: Invalid line range: start_line (${startLineNum}) > end_line (${endLineNum})`
			}

			content = lines.slice(start, end + 1).join("\n")
		} else {
			content = fileContent
		}

		// 构建结果
		let result = `File: ${relPath}\n`

		if (isRangeRead) {
			const start = startLine !== undefined ? startLine + 1 : 1
			const end = endLine !== undefined ? endLine + 1 : totalLines
			result += `Lines: ${start}-${end} of ${totalLines}\n`
		} else {
			result += `Total lines: ${totalLines}\n`
		}

		result += "\n```\n" + content + "\n```"

		return result
	} catch (error) {
		console.error(`Error reading file ${relPath}:`, error)
		return `Error reading file ${relPath}: ${error instanceof Error ? error.message : String(error)}`
	}
}
