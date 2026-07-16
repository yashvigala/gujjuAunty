import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@gujjuaunty/backend/convex/_generated/api'
import type { Id } from '@gujjuaunty/backend/convex/_generated/dataModel'
import type { FunctionReturnType } from 'convex/server'
import { rupeesToPaise } from '../lib/money'
import { uploadFiles } from '../lib/upload'

type AdminItem = FunctionReturnType<typeof api.items.listAll>[number]

// One form for both modes: `item` present → edit, absent → create.
export function ItemForm({
  item,
  onDone,
}: {
  item: AdminItem | null
  onDone: () => void
}) {
  const create = useMutation(api.items.create)
  const update = useMutation(api.items.update)
  const generateUploadUrl = useMutation(api.items.generateUploadUrl)

  const [name, setName] = useState(item?.name ?? '')
  const [description, setDescription] = useState(item?.description ?? '')
  const [priceRupees, setPriceRupees] = useState(
    item ? (item.price / 100).toString() : '',
  )
  const [stock, setStock] = useState(item ? item.stock.toString() : '')
  // Existing images the admin has chosen to keep (edit mode only).
  const [keptImages, setKeptImages] = useState<
    { id: Id<'_storage'>; url: string }[]
  >(
    item
      ? item.imageIds.flatMap((id, i) => {
          const url = item.imageUrls[i]
          return url !== undefined ? [{ id, url }] : []
        })
      : [],
  )
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const price = rupeesToPaise(priceRupees)
    if (price === null) {
      setError('Enter a valid price in rupees, e.g. 249 or 249.50')
      return
    }
    const stockNum = Number(stock)
    if (!Number.isInteger(stockNum) || stockNum < 0) {
      setError('Stock must be zero or a positive whole number')
      return
    }

    setSaving(true)
    try {
      const uploadedIds = await uploadFiles(newFiles, generateUploadUrl)
      const imageIds = [...keptImages.map((img) => img.id), ...uploadedIds]
      if (item) {
        await update({
          id: item._id,
          name,
          description: description || undefined,
          price,
          stock: stockNum,
          imageIds,
        })
      } else {
        await create({
          name,
          description: description || undefined,
          price,
          stock: stockNum,
          imageIds,
        })
      }
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong saving the item')
      setSaving(false)
    }
  }

  return (
    <form className="item-form card" onSubmit={handleSubmit}>
      <h2>{item ? `Edit: ${item.name}` : 'New item'}</h2>

      <div className="field">
        <label htmlFor="item-name">Name</label>
        <input
          id="item-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="field">
        <label htmlFor="item-description">Description (optional)</label>
        <textarea
          id="item-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="item-price">Price (₹)</label>
          <input
            id="item-price"
            type="number"
            min="0.01"
            step="0.01"
            value={priceRupees}
            onChange={(e) => setPriceRupees(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="item-stock">Stock</label>
          <input
            id="item-stock"
            type="number"
            min="0"
            step="1"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            required
          />
        </div>
      </div>

      {keptImages.length > 0 && (
        <div className="field">
          <span className="field-label">Current images (click × to remove)</span>
          <div className="thumbs">
            {keptImages.map((img) => (
              <div className="thumb" key={img.id}>
                <img src={img.url} alt="" />
                <button
                  type="button"
                  aria-label="Remove image"
                  onClick={() =>
                    setKeptImages(keptImages.filter((k) => k.id !== img.id))
                  }
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="field">
        <label htmlFor="item-images">
          {item ? 'Add images' : 'Images'} (stored in Convex storage)
        </label>
        <input
          id="item-images"
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => setNewFiles(Array.from(e.target.files ?? []))}
        />
        {newFiles.length > 0 && (
          <span className="muted small">
            {newFiles.length} file{newFiles.length === 1 ? '' : 's'} selected
          </span>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      <div className="form-actions">
        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? 'Saving…' : item ? 'Save changes' : 'Create item'}
        </button>
        <button className="btn" type="button" onClick={onDone} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  )
}
