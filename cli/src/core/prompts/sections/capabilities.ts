/**
 * 获取能力部分
 * @param cwd 当前工作目录
 * @returns 能力部分
 */
export function getCapabilitiesSection(cwd: string): string {
  return `# CAPABILITIES

You have the following capabilities:

1. Reading files to understand code and documentation
2. Writing to files to create or modify code
3. Executing commands to run tests, install dependencies, or perform other operations
4. Searching files to find relevant code or documentation
5. Listing files to explore the project structure

Your working directory is: ${cwd}

You should use these capabilities to help the user accomplish their tasks. Always use the most appropriate tool for the job, and be mindful of the user's time and resources.`;
}
