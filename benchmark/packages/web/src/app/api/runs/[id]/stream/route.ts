import type { NextRequest } from "next/server"

import { findRun } from "@benchmark/db"
import { IpcClient } from "@benchmark/ipc"

import { SSEStream } from "@/lib/server/sse-stream"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params
	const stream = new SSEStream()
	const run = await findRun(Number(id))
	const client = new IpcClient(`/tmp/benchmark-${run.id}.sock`, () => {})

	const write = async (data: string | object) => {
		const success = await stream.write(data)

		if (!success) {
			client.disconnect()
		}
	}

	client.on("connect", () => write("connect"))
	client.on("disconnect", () => write("disconnect"))
	client.on("message", write)

	request.signal.addEventListener("abort", () => {
		console.log(`abort`)
		client.disconnect()
		stream.close().catch(() => {})
	})

	return stream.getResponse()
}
