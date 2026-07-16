import type { Id } from '@gujjuaunty/backend/convex/_generated/dataModel'

// The upload endpoint replies with JSON we don't control the type of at
// compile time — narrow it at the boundary instead of casting blindly.
function isUploadResponse(x: unknown): x is { storageId: Id<'_storage'> } {
  return (
    typeof x === 'object' &&
    x !== null &&
    'storageId' in x &&
    typeof (x as Record<string, unknown>).storageId === 'string'
  )
}

// Convex file upload: ask the backend for a signed URL, POST the raw file to
// it, get back the storage ID to save on a document.
export async function uploadFiles(
  files: readonly File[],
  generateUploadUrl: () => Promise<string>,
): Promise<Id<'_storage'>[]> {
  const ids: Id<'_storage'>[] = []
  for (const file of files) {
    const url = await generateUploadUrl()
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': file.type },
      body: file,
    })
    if (!res.ok) {
      throw new Error(`Upload of ${file.name} failed with HTTP ${res.status}`)
    }
    const data: unknown = await res.json()
    if (!isUploadResponse(data)) {
      throw new Error(`Upload of ${file.name} returned an unexpected response`)
    }
    ids.push(data.storageId)
  }
  return ids
}
