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
const settingsPath = path.join(rootDir, 'data', 'settings.json')
const uploadsDir = path.join(rootDir, 'uploads')

const defaultSettings = {
  brandName: 'NO WORK TEAM',
  tagline: 'Surfing Brand',
  sinceText: 'Desde 1986',
  heroTitle: 'La tienda de NO WORK TEAM en formato app.',
  heroText: 'Mantiene el tono visual de la marca, el mensaje surf lifestyle y un catálogo editable desde panel admin con subida directa de fotos.',
  primaryColor: '#f0c38b',
  secondaryColor: '#bf7a37',
  backgroundColor: '#0c0b09',
  cardColor: '#171411',
  textColor: '#f7efe6',
  logoUrl: '',
  heroImage: '',
  promoText: 'Envíos a Canarias y Península · compra segura · marca surfera desde 1986'
}

await fs.mkdir(uploadsDir, { recursive: true })

try {
  await fs.access(settingsPath)
} catch {
  await fs.writeFile(settingsPath, JSON.stringify(defaultSettings, null, 2))
}

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
app.use(express.json({ limit: '12mb' }))
app.use('/uploads', express.static(uploadsDir))

async function readProducts() {
  const raw = await fs.readFile(dataPath, 'utf8')
  return JSON.parse(raw)
}

async function writeProducts(products) {
  await fs.writeFile(dataPath, JSON.stringify(products, null, 2))
}

async function readSettings() {
  const raw = await fs.readFile(settingsPath, 'utf8')
  return { ...defaultSettings, ...JSON.parse(raw) }
}

async function writeSettings(settings) {
  await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2))
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

function normalizeSettings(body = {}) {
  return {
    brandName: String(body.brandName || defaultSettings.brandName).trim(),
    tagline: String(body.tagline || defaultSettings.tagline).trim(),
    sinceText: String(body.sinceText || defaultSettings.sinceText).trim(),
    heroTitle: String(body.heroTitle || defaultSettings.heroTitle).trim(),
    heroText: String(body.heroText || defaultSettings.heroText).trim(),
    primaryColor: String(body.primaryColor || defaultSettings.primaryColor).trim(),
    secondaryColor: String(body.secondaryColor || defaultSettings.secondaryColor).trim(),
    backgroundColor: String(body.backgroundColor || defaultSettings.backgroundColor).trim(),
    cardColor: String(body.cardColor || defaultSettings.cardColor).trim(),
    textColor: String(body.textColor || defaultSettings.textColor).trim(),
    logoUrl: String(body.logoUrl || '').trim(),
    heroImage: String(body.heroImage || '').trim(),
    promoText: String(body.promoText || defaultSettings.promoText).trim()
  }
}

app.get('/api/health', (_req, res) => res.json({ ok: true }))

app.get('/api/products', async (_req, res) => {
  const products = await readProducts()
  res.json(products.sort((a, b) => a.id - b.id))
})

app.get('/api/settings', async (_req, res) => {
  const settings = await readSettings()
  res.json(settings)
})

app.put('/api/settings', async (req, res) => {
  const settings = normalizeSettings(req.body)
  if (!settings.brandName || !settings.heroTitle) {
    return res.status(400).json({ message: 'Completa al menos nombre de marca y título principal.' })
  }
  await writeSettings(settings)
  res.json(settings)
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
