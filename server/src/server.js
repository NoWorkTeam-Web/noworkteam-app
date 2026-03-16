import express from 'express'
import cors from 'cors'
import multer from 'multer'
import path from 'path'
import fs from 'fs/promises'
import { existsSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import Stripe from 'stripe'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..', '..')
const serverRoot = path.resolve(__dirname, '..')
const clientDistDir = path.join(projectRoot, 'client', 'dist')
const dataDir = path.join(serverRoot, 'data')
const uploadsDir = path.join(serverRoot, 'uploads')
const productsFile = path.join(dataDir, 'products.json')
const settingsFile = path.join(dataDir, 'settings.json')
const PORT = process.env.PORT || 3001
const isProduction = process.env.NODE_ENV === 'production'
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`

if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })
if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadsDir),
  filename: (_, file, cb) => {
    const safe = file.originalname.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9._-]/g, '')
    cb(null, `${Date.now()}-${safe}`)
  }
})

const upload = multer({ storage })
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null

const app = express()
app.use(cors())
app.use(express.json({ limit: '15mb' }))
app.use('/uploads', express.static(uploadsDir))

async function readJson(filePath, fallback) {
  try {
    const content = await fs.readFile(filePath, 'utf8')
    return JSON.parse(content)
  } catch {
    return fallback
  }
}

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8')
}

function normalizeProduct(req, current = {}) {
  const body = req.body || {}
  const image = req.file ? `/uploads/${req.file.filename}` : (body.image || current.image || '')
  const sizes = String(body.sizes ?? current.sizes ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  return {
    name: body.name ?? current.name ?? '',
    category: body.category ?? current.category ?? 'Camisetas hombre',
    price: Number(body.price ?? current.price ?? 0),
    stock: Number(body.stock ?? current.stock ?? 0),
    badge: body.badge ?? current.badge ?? 'Nuevo',
    subtitle: body.subtitle ?? current.subtitle ?? 'Sin isla',
    description: body.description ?? current.description ?? '',
    image,
    sizes,
    featured: String(body.featured ?? current.featured ?? 'false') === 'true' || current.featured === true,
    originUrl: body.originUrl ?? current.originUrl ?? ''
  }
}

app.get('/api/products', async (_, res) => {
  const products = await readJson(productsFile, [])
  res.json(products)
})

app.post('/api/products', upload.single('file'), async (req, res) => {
  const products = await readJson(productsFile, [])
  const product = {
    id: products.reduce((max, item) => Math.max(max, item.id), 0) + 1,
    ...normalizeProduct(req)
  }

  if (!product.name || !product.category || !product.description || Number.isNaN(product.price) || Number.isNaN(product.stock)) {
    return res.status(400).json({ message: 'Completa nombre, categoría, precio, stock y descripción.' })
  }

  products.push(product)
  await writeJson(productsFile, products)
  res.status(201).json(product)
})

app.put('/api/products/:id', upload.single('file'), async (req, res) => {
  const id = Number(req.params.id)
  const products = await readJson(productsFile, [])
  const index = products.findIndex((item) => item.id === id)
  if (index === -1) return res.status(404).json({ message: 'Producto no encontrado.' })

  const updated = { id, ...normalizeProduct(req, products[index]) }
  if (!updated.name || !updated.category || !updated.description || Number.isNaN(updated.price) || Number.isNaN(updated.stock)) {
    return res.status(400).json({ message: 'Completa nombre, categoría, precio, stock y descripción.' })
  }

  products[index] = updated
  await writeJson(productsFile, products)
  res.json(updated)
})

app.delete('/api/products/:id', async (req, res) => {
  const id = Number(req.params.id)
  const products = await readJson(productsFile, [])
  const existing = products.find((item) => item.id === id)
  if (!existing) return res.status(404).json({ message: 'Producto no encontrado.' })
  await writeJson(productsFile, products.filter((item) => item.id !== id))
  res.status(204).end()
})

app.get('/api/settings', async (_, res) => {
  const settings = await readJson(settingsFile, {})
  res.json(settings)
})

app.put('/api/settings', async (req, res) => {
  const next = req.body || {}
  await writeJson(settingsFile, next)
  res.json(next)
})

app.post('/api/create-checkout-session', async (req, res) => {
  if (!stripe) {
    return res.status(400).json({
      message: 'Añade STRIPE_SECRET_KEY en el servidor para activar el checkout de prueba.'
    })
  }

  const items = Array.isArray(req.body?.items) ? req.body.items : []
  if (!items.length) {
    return res.status(400).json({ message: 'El carrito está vacío.' })
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: items.map((item) => ({
        quantity: item.quantity,
        price_data: {
          currency: 'eur',
          unit_amount: Math.round(Number(item.price) * 100),
          product_data: {
            name: item.name,
            description: item.description?.slice(0, 300) || undefined,
            images: item.image?.startsWith('http') ? [item.image] : []
          }
        }
      })),
      success_url: `${PUBLIC_BASE_URL}/?checkout=success`,
      cancel_url: `${PUBLIC_BASE_URL}/?checkout=cancel`
    })

    res.json({ url: session.url })
  } catch (error) {
    res.status(500).json({ message: error.message || 'No se pudo crear la sesión de Stripe.' })
  }
})

if (isProduction && existsSync(clientDistDir)) {
  app.use(express.static(clientDistDir))
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next()
    res.sendFile(path.join(clientDistDir, 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`NO WORK TEAM lista en http://localhost:${PORT}`)
})
