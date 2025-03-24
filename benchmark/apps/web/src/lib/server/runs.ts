"use server"

import { spawn } from "child_process"
import path from "path"
import os from "os"

import { revalidatePath } from "next/cache"

import { Language } from "@benchmark/types"
import * as db from "@benchmark/db"

import { CreateRun } from "@/lib/schemas"

export async function createRun({ suite, exercises = [], ...values }: CreateRun) {
	const run = await db.createRun({
		...values,
		socketPath: path.join(os.tmpdir(), `benchmark-${crypto.randomUUID()}.sock`),
	})

	if (suite === "partial") {
		for (const path of exercises) {
			const [language, exercise] = path.split("/")

			if (!language || !exercise) {
				throw new Error("Invalid exercise path: " + path)
			}

			await db.createTask({ ...values, runId: run.id, language: language as Language, exercise })
		}
	}

	revalidatePath("/runs")

	try {
		const process = spawn(
			"pnpm",
			["--filter", "@benchmark/cli", "dev", "run", "all", "--runId", run.id.toString()],
			{
				detached: true,
				stdio: "ignore",
			},
		)

		process.unref()
		await db.updateRun(run.id, { pid: process.pid })
	} catch (error) {
		console.error(error)
	}

	return run
}
