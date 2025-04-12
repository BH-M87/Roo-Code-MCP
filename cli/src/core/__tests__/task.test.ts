import { handleNewTask } from "../task"
import { createApiHandler } from "../../api"
import { mockApiConfigs, mockApiResponses, mockModelInfo, activeModels } from "./test-config"
import { ContinuousExecutor } from "../continuous-executor"

// Mock the API handler and continuous executor
jest.mock("../../api", () => ({
	createApiHandler: jest.fn(),
}))

jest.mock("../continuous-executor", () => ({
	ContinuousExecutor: jest.fn().mockImplementation(() => ({
		execute: jest.fn().mockResolvedValue({
			taskId: "test-task-id",
			output: "Task executed in continuous mode",
			success: true,
		}),
	})),
}))

describe("Task Handler", () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	if (activeModels.includes("anthropic")) {
		it("should handle a new task successfully with Anthropic API", async () => {
			// Mock the API handler
			const mockSendRequest = jest.fn().mockResolvedValue(mockApiResponses.anthropic)
			const mockGetModel = jest.fn().mockReturnValue(mockModelInfo.anthropic)

			;(createApiHandler as jest.Mock).mockReturnValue({
				sendRequest: mockSendRequest,
				getModel: mockGetModel,
			})

			// Execute the task
			const result = await handleNewTask({
				prompt: "Test prompt",
				mode: "code",
				apiConfig: mockApiConfigs.anthropic,
			})

			// Verify the result
			expect(result.success).toBe(true)
			expect(result.output).toBe(mockApiResponses.anthropic.text)
			expect(createApiHandler).toHaveBeenCalledWith(mockApiConfigs.anthropic)
			expect(mockSendRequest).toHaveBeenCalledWith(expect.stringContaining("Test prompt"))
		})
	} else {
		it.skip("should handle a new task successfully with Anthropic API", async () => {
			// Test skipped because Anthropic is not in activeModels
		})
	}

	if (activeModels.includes("openai")) {
		it("should handle a new task successfully with OpenAI API", async () => {
			// Mock the API handler
			const mockSendRequest = jest.fn().mockResolvedValue(mockApiResponses.openai)
			const mockGetModel = jest.fn().mockReturnValue(mockModelInfo.openai)

			;(createApiHandler as jest.Mock).mockReturnValue({
				sendRequest: mockSendRequest,
				getModel: mockGetModel,
			})

			// Execute the task
			const result = await handleNewTask({
				prompt: "Test prompt",
				mode: "code",
				apiConfig: mockApiConfigs.openai,
			})

			// Verify the result
			expect(result.success).toBe(true)
			expect(result.output).toBe(mockApiResponses.openai.text)
			expect(createApiHandler).toHaveBeenCalledWith(mockApiConfigs.openai)
			expect(mockSendRequest).toHaveBeenCalledWith(expect.stringContaining("Test prompt"))
		})
	} else {
		it.skip("should handle a new task successfully with OpenAI API", async () => {
			// Test skipped because OpenAI is not in activeModels
		})
	}

	it("should handle errors", async () => {
		// Mock the API handler to throw an error
		;(createApiHandler as jest.Mock).mockReturnValue({
			sendRequest: jest.fn().mockRejectedValue(new Error("API error")),
			getModel: jest.fn().mockReturnValue(mockModelInfo.anthropic),
		})

		// Execute the task
		const result = await handleNewTask({
			prompt: "Test prompt",
			mode: "code",
			apiConfig: mockApiConfigs[activeModels[0]],
		})

		// Verify the result
		expect(result.success).toBe(false)
		expect(result.error).toBe("API error")
	})

	it("should use continuous execution mode when continuous is true", async () => {
		// Execute the task with continuous mode
		const result = await handleNewTask({
			prompt: "Test prompt",
			mode: "code",
			apiConfig: mockApiConfigs[activeModels[0]],
			continuous: true,
			maxSteps: 5,
			verbose: true,
		})

		// Verify the result
		expect(result.success).toBe(true)
		expect(result.output).toBe("Task executed in continuous mode")
		expect(ContinuousExecutor).toHaveBeenCalledWith(
			mockApiConfigs[activeModels[0]],
			"code",
			expect.any(String),
			5,
			true,
		)
	})
})
