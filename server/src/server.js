import express from 'express'
import cors from 'cors'
import fs from 'fs/promises'
import path from 'path'
import multer from 'multer'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.join(__dirname, '..')
const projectRoot = path.join(rootDir, '..')
const clientDistDir = path.join(projectRoot, 'client', 'dist')
const dataPath = path.join(rootDir, 'data', 'products.json')
const uploadsDir = path.join(rootDir, 'uploads')

await fs.mkdir(uploadsDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const safe = file.originalname.toLowerCase().replace(/[^a-z0-9.\-_]/g, '-')
    cb(null, `${Date.now()}-${safe}`)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }
})

const app = express()
const PORT = process.env.PORT || 4000
const isProduction = process.env.NODE_ENV === 'production'

app.use(cors())
app.use(express.json())
app.use('/uploads', express.static(uploadsDir))

async function readProducts() {
  const raw = await fs.readFile(dataPath, 'utf8')
  return JSON.parse(raw)
}

async function writeProducts(products) {
  await fs.writeFile(dataPath, JSON.stringify(products, null, 2))
}

function normalizeProduct(req, current = {}) {
  const body = req.body
  const fromFile = req.file ? `/uploads/${req.file.filename}` : undefined
  return {
    ...current,
    name: body.name?.trim(),
    category: body.category?.trim(),
    price: Number(body.price),
    stock: Number(body.stock),
    badge: body.badge?.trim() || 'Nuevo',
    subtitle: body.subtitle?.trim() || 'Sin isla',
    description: body.description?.trim(),
    sizes: (body.sizes || '').split(',').map((item) => item.trim()).filter(Boolean),
    featured: String(body.featured) === 'true',
    image: fromFile || body.image?.trim() || current.image || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=80'
  }
}

app.get('/api/health', (_req, res) => res.json({ ok: true }))

app.get('/api/products', async (_req, res) => {
  const products = await readProducts()
  res.json(products.sort((a, b) => a.id - b.id))
})

app.post('/api/products', upload.single('file'), async (req, res) => {
  const products = await readProducts()
  const nextId = products.length ? Math.max(...products.map((item) => item.id)) + 1 : 1
  const product = { id: nextId, ...normalizeProduct(req) }

  if (!product.name || !product.category || !product.description || Number.isNaN(product.price) || Number.isNaN(product.stock)) {
    return res.status(400).json({ message: 'Completa nombre, categoría, precio, stock y descripción.' })
  }

  products.push(product)
  await writeProducts(products)
  res.status(201).json(product)
})

app.put('/api/products/:id', upload.single('file'), async (req, res) => {
  const id = Number(req.params.id)
  const products = await readProducts()
  const index = products.findIndex((item) => item.id === id)
  if (index === -1) return res.status(404).json({ message: 'Producto no encontrado.' })

  const current = products[index]
  const updated = { id, ...normalizeProduct(req, current) }
  if (!updated.name || !updated.category || !updated.description || Number.isNaN(updated.price) || Number.isNaN(updated.stock)) {
    return res.status(400).json({ message: 'Completa nombre, categoría, precio, stock y descripción.' })
  }

  products[index] = updated
  await writeProducts(products)
  res.json(updated)
})

app.delete('/api/products/:id', async (req, res) => {
  const id = Number(req.params.id)
  const products = await readProducts()
  const existing = products.find((item) => item.id === id)
  if (!existing) return res.status(404).json({ message: 'Producto no encontrado.' })
  await writeProducts(products.filter((item) => item.id !== id))
  res.status(204).end()
})

if (isProduction) {
  app.use(express.static(clientDistDir))

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next()
    res.sendFile(path.join(clientDistDir, 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`NO WORK TEAM lista en http://localhost:${PORT}`)
})
