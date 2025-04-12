import { Provider } from "../provider"
import { executeTask } from "../task"
import { mockApiConfigs, mockApiResponses, activeModels } from "./test-config"

// Mock the task execution
jest.mock("../task", () => ({
	executeTask: jest.fn(),
}))

describe("Provider", () => {
	// Use the mock API config from test-config
	const mockApiConfig = mockApiConfigs.anthropic

	const mockSettings = {
		autoApprovalEnabled: true,
	}

	const mockCustomModes = [
		{
			slug: "test",
			name: "Test",
			roleDefinition: "Test role",
			groups: ["read"],
			source: "project",
		},
	]

	beforeEach(() => {
		jest.clearAllMocks()
	})

	it("should initialize with the provided configuration", () => {
		const provider = new Provider(mockApiConfig, mockSettings, mockCustomModes)

		expect(provider.getApiConfig()).toEqual(mockApiConfig)
		expect(provider.getSettings()).toEqual(mockSettings)
		expect(provider.getCustomModes()).toEqual(mockCustomModes)
		expect(provider.getCurrentMode()).toBe("code")
	})

	it("should set and get the current mode", () => {
		const provider = new Provider(mockApiConfig, mockSettings, mockCustomModes)

		provider.setCurrentMode("test")
		expect(provider.getCurrentMode()).toBe("test")

		// Should throw for invalid mode
		expect(() => provider.setCurrentMode("invalid")).toThrow("Invalid mode: invalid")
	})

	if (activeModels.includes("anthropic")) {
		it("should execute a task with Anthropic API", async () => {
			const provider = new Provider(mockApiConfig, mockSettings, mockCustomModes)

			const mockResult = {
				taskId: "test-task-id",
				output: mockApiResponses.anthropic.text,
				success: true,
			}

			;(executeTask as jest.Mock).mockResolvedValue(mockResult)

			// Add event listener to test events
			const taskStartedHandler = jest.fn()
			const taskCompletedHandler = jest.fn()

			provider.on("taskStarted", taskStartedHandler)
			provider.on("taskCompleted", taskCompletedHandler)

			const result = await provider.executeTask("Test prompt", "code")

			expect(result).toEqual(mockResult)
			expect(executeTask).toHaveBeenCalledWith(
				{
					message: "Test prompt",
					mode: "code",
					cwd: undefined,
				},
				mockApiConfig,
			)

			expect(taskStartedHandler).toHaveBeenCalledWith({ prompt: "Test prompt", mode: "code" })
			expect(taskCompletedHandler).toHaveBeenCalledWith(mockResult)
			expect(provider.getActiveTaskId()).toBe("test-task-id")
		})
	} else {
		it.skip("should execute a task with Anthropic API", async () => {
			// Test skipped because Anthropic is not in activeModels
		})
	}

	if (activeModels.includes("openai")) {
		it("should execute a task with OpenAI API", async () => {
			// Create provider with OpenAI config
			const provider = new Provider(mockApiConfigs.openai, mockSettings, mockCustomModes)

			const mockResult = {
				taskId: "test-task-id-openai",
				output: mockApiResponses.openai.text,
				success: true,
			}

			;(executeTask as jest.Mock).mockResolvedValue(mockResult)

			// Add event listener to test events
			const taskStartedHandler = jest.fn()
			const taskCompletedHandler = jest.fn()

			provider.on("taskStarted", taskStartedHandler)
			provider.on("taskCompleted", taskCompletedHandler)

			const result = await provider.executeTask("Test prompt", "code")

			expect(result).toEqual(mockResult)
			expect(executeTask).toHaveBeenCalledWith(
				{
					message: "Test prompt",
					mode: "code",
					cwd: undefined,
				},
				mockApiConfigs.openai,
			)

			expect(taskStartedHandler).toHaveBeenCalledWith({ prompt: "Test prompt", mode: "code" })
			expect(taskCompletedHandler).toHaveBeenCalledWith(mockResult)
			expect(provider.getActiveTaskId()).toBe("test-task-id-openai")
		})
	} else {
		it.skip("should execute a task with OpenAI API", async () => {
			// Test skipped because OpenAI is not in activeModels
		})
	}
})
