/**
 * File Storage Module
 *
 * TODO: Implement actual storage backend (S3, GCS, R2, or local filesystem)
 * Currently stubbed out - file uploads will fail until implemented.
 */

export interface UploadResult {
	fileUrl: string | null
	fileSize: number
	filePath: string
}

export interface UpdateFileResult {
	fileSize: number
	itemCount: number
}

const STORAGE_NOT_CONFIGURED_MSG =
	"File storage not configured. Implement S3, GCS, R2, or local storage in web/packages/backend/src/lib/storage.ts"

export async function uploadDatasetFile(
	organizationId: string,
	datasetId: string,
	file: File
): Promise<UploadResult> {
	console.warn(STORAGE_NOT_CONFIGURED_MSG)
	throw new Error(STORAGE_NOT_CONFIGURED_MSG)
}

export async function deleteDatasetFile(filePath: string): Promise<void> {
	console.warn(STORAGE_NOT_CONFIGURED_MSG)
}

export async function getSignedUrl(filePath: string, expiresInSeconds: number = 3600): Promise<string> {
	console.warn(STORAGE_NOT_CONFIGURED_MSG)
	throw new Error(STORAGE_NOT_CONFIGURED_MSG)
}

export async function downloadFile(filePath: string): Promise<string> {
	console.warn(STORAGE_NOT_CONFIGURED_MSG)
	throw new Error(STORAGE_NOT_CONFIGURED_MSG)
}

export async function updateFile(filePath: string, content: string): Promise<UpdateFileResult> {
	console.warn(STORAGE_NOT_CONFIGURED_MSG)
	throw new Error(STORAGE_NOT_CONFIGURED_MSG)
}

export function validateDatasetFile(file: File): void {
	const MAX_SIZE = 100 * 1024 * 1024 // 100MB
	const ALLOWED_EXTENSIONS = [".json", ".jsonl", ".csv", ".ndjson"]

	if (file.size > MAX_SIZE) {
		throw new Error(`File size exceeds maximum of 100MB (got ${Math.round(file.size / 1024 / 1024)}MB)`)
	}

	const extension = file.name.toLowerCase().slice(file.name.lastIndexOf("."))
	if (!ALLOWED_EXTENSIONS.includes(extension)) {
		throw new Error(`Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`)
	}
}

export async function countJsonlLines(file: File): Promise<number> {
	const text = await file.text()
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
