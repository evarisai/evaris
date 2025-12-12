import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const BUCKET_NAME = "datasets"

let supabase: SupabaseClient | null = null

function getSupabaseClient(): SupabaseClient {
	if (!supabase) {
		const supabaseUrl = process.env.SUPABASE_URL
		const supabaseKey = process.env.SUPABASE_SECRET_KEY

		if (!supabaseUrl || !supabaseKey) {
			throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY are required for file storage")
		}

		supabase = createClient(supabaseUrl, supabaseKey)
	}
	return supabase
}

export interface UploadResult {
	fileUrl: string | null // null for private buckets
	fileSize: number
	filePath: string
}

export async function uploadDatasetFile(
	organizationId: string,
	datasetId: string,
	file: File
): Promise<UploadResult> {
	const client = getSupabaseClient()

	// Create a unique path: org_id/dataset_id/filename
	const timestamp = Date.now()
	const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
	const filePath = `${organizationId}/${datasetId}/${timestamp}_${sanitizedName}`

	// Convert File to ArrayBuffer for upload
	const arrayBuffer = await file.arrayBuffer()
	const buffer = new Uint8Array(arrayBuffer)

	const { error } = await client.storage.from(BUCKET_NAME).upload(filePath, buffer, {
		contentType: file.type || "application/octet-stream",
		upsert: false,
	})

	if (error) {
		throw new Error(`Failed to upload file: ${error.message}`)
	}

	// For private buckets, we don't store a public URL
	// Downloads go through signed URLs generated on-demand
	return {
		fileUrl: null,
		fileSize: file.size,
		filePath,
	}
}

export async function deleteDatasetFile(filePath: string): Promise<void> {
	const client = getSupabaseClient()

	const { error } = await client.storage.from(BUCKET_NAME).remove([filePath])

	if (error) {
		console.error(`Failed to delete file ${filePath}:`, error.message)
		// Don't throw - file deletion failure shouldn't block dataset deletion
	}
}

export async function getSignedUrl(
	filePath: string,
	expiresInSeconds: number = 3600
): Promise<string> {
	const client = getSupabaseClient()

	const { data, error } = await client.storage
		.from(BUCKET_NAME)
		.createSignedUrl(filePath, expiresInSeconds)

	if (error) {
		throw new Error(`Failed to create signed URL: ${error.message}`)
	}

	return data.signedUrl
}

export async function downloadFile(filePath: string): Promise<string> {
	const client = getSupabaseClient()

	const { data, error } = await client.storage.from(BUCKET_NAME).download(filePath)

	if (error) {
		throw new Error(`Failed to download file: ${error.message}`)
	}

	return await data.text()
}

function countValidJsonLines(text: string): number {
	const lines = text.split("\n").filter((line) => line.trim().length > 0)
	let count = 0
	for (const line of lines) {
		try {
			JSON.parse(line)
			count++
		} catch {
			// Skip invalid lines
		}
	}
	return count
}

export interface UpdateFileResult {
	fileSize: number
	itemCount: number
}

export async function updateFile(filePath: string, content: string): Promise<UpdateFileResult> {
	const client = getSupabaseClient()

	const encoder = new TextEncoder()
	const buffer = encoder.encode(content)

	const { error } = await client.storage.from(BUCKET_NAME).update(filePath, buffer, {
		contentType: "application/json",
		upsert: true,
	})

	if (error) {
		throw new Error(`Failed to update file: ${error.message}`)
	}

	return {
		fileSize: buffer.length,
		itemCount: countValidJsonLines(content),
	}
}

export function validateDatasetFile(file: File): void {
	const MAX_SIZE = 100 * 1024 * 1024 // 100MB
	const ALLOWED_TYPES = ["application/json", "text/plain", "application/x-ndjson", "text/csv"]
	const ALLOWED_EXTENSIONS = [".json", ".jsonl", ".csv", ".ndjson"]

	if (file.size > MAX_SIZE) {
		throw new Error(
			`File size exceeds maximum of 100MB (got ${Math.round(file.size / 1024 / 1024)}MB)`
		)
	}

	const extension = file.name.toLowerCase().slice(file.name.lastIndexOf("."))
	const hasValidExtension = ALLOWED_EXTENSIONS.includes(extension)
	const hasValidType = ALLOWED_TYPES.includes(file.type) || file.type === ""

	if (!hasValidExtension && !hasValidType) {
		throw new Error(`Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`)
	}
}

export async function countJsonlLines(file: File): Promise<number> {
	const text = await file.text()
	return countValidJsonLines(text)
}
