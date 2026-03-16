import { useEffect, useMemo, useState } from 'react'

const currency = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })

const categories = [
  'Todos',
  'Camisetas hombre',
  'Camisetas mujer',
  'Sudaderas unisex',
  'Chaquetas',
  'Gorras y sombreros',
  'Lycras unisex',
  'Niño/a'
]

const emptyForm = {
  id: null,
  name: '',
  category: 'Camisetas hombre',
  price: '24.99',
  stock: '10',
  badge: 'Nuevo',
  subtitle: 'Sin isla',
  description: '',
  image: '',
  sizes: 'S, M, L, XL',
  featured: false,
  originUrl: ''
}

const defaultSettings = {
  brandName: 'NO WORK TEAM',
  tagline: 'Surfing Brand',
  sinceText: 'Desde 1986',
  heroTitle: 'Una app más moderna para una marca con alma surf.',
  heroText: 'Catálogo importado, checkout con Stripe test, editor visual y base lista para iPhone y Android con Capacitor.',
  primaryColor: '#f2c182',
  secondaryColor: '#ca7b3b',
  backgroundColor: '#0b0d10',
  cardColor: '#13171c',
  textColor: '#f7f3ed',
  logoUrl: '',
  heroImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80',
  promoText: 'Envío Canarias gratis · Península 10€ · pagos con tarjeta en modo prueba',
  announcement: 'Colección importada y preparada para crecer como app nativa.',
  mobileAppText: 'Lista para instalar como PWA y empaquetar con Capacitor.',
  instagramHandle: '@noworkteam'
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function formatSizes(value) {
  if (Array.isArray(value)) return value
  return String(value || '').split(',').map((item) => item.trim()).filter(Boolean)
}

export default function App() {
  const [products, setProducts] = useState([])
  const [cart, setCart] = useState([])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Todos')
  const [adminOpen, setAdminOpen] = useState(false)
  const [designOpen, setDesignOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [settingsMessage, setSettingsMessage] = useState('')
  const [checkoutMessage, setCheckoutMessage] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [selectedFile, setSelectedFile] = useState(null)
  const [settings, setSettings] = useState(defaultSettings)
  const [settingsForm, setSettingsForm] = useState(defaultSettings)
  const [selectedProduct, setSelectedProduct] = useState(null)

  useEffect(() => {
    fetchProducts()
    fetchSettings()
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--accent', settings.primaryColor || defaultSettings.primaryColor)
    root.style.setProperty('--accent-strong', settings.secondaryColor || defaultSettings.secondaryColor)
    root.style.setProperty('--bg', settings.backgroundColor || defaultSettings.backgroundColor)
    root.style.setProperty('--surface', settings.cardColor || defaultSettings.cardColor)
    root.style.setProperty('--text', settings.textColor || defaultSettings.textColor)
  }, [settings])

  async function fetchProducts() {
    const res = await fetch('/api/products')
    const data = await res.json()
    setProducts(data)
  }

  async function fetchSettings() {
    const res = await fetch('/api/settings')
    const data = await res.json()
    setSettings({ ...defaultSettings, ...data })
    setSettingsForm({ ...defaultSettings, ...data })
  }

  const featuredProducts = useMemo(
    () => products.filter((item) => item.featured).slice(0, 6),
    [products]
  )

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const inCategory = category === 'Todos' || product.category === category
      const source = `${product.name} ${product.badge} ${product.description} ${product.subtitle}`.toLowerCase()
      return inCategory && source.includes(query.toLowerCase())
    })
  }, [products, category, query])

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0)
  const shipping = subtotal > 90 || subtotal === 0 ? 0 : 4.99
  const total = subtotal + shipping

  const categoryCounts = useMemo(
    () => categories.reduce((acc, item) => ({
      ...acc,
      [item]: item === 'Todos' ? products.length : products.filter((product) => product.category === item).length
    }), {}),
    [products]
  )

  function addToCart(product) {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id)
      if (existing) return current.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
      return [...current, { ...product, quantity: 1 }]
    })
  }

  function updateQuantity(id, delta) {
    setCart((current) => current
      .map((item) => item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item)
      .filter((item) => item.quantity > 0))
  }

  function openCreate() {
    setSelectedFile(null)
    setForm(emptyForm)
    setMessage('')
    setAdminOpen(true)
  }

  function openEdit(product) {
    setSelectedFile(null)
    setForm({
      ...product,
      price: String(product.price),
      stock: String(product.stock),
      sizes: formatSizes(product.sizes).join(', ')
    })
    setMessage('')
    setAdminOpen(true)
  }

  function openDesignEditor() {
    setSettingsMessage('')
    setSettingsForm(settings)
    setDesignOpen(true)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setMessage('')

    const payload = new FormData()
    payload.append('name', form.name)
    payload.append('category', form.category)
    payload.append('price', form.price)
    payload.append('stock', form.stock)
    payload.append('badge', form.badge)
    payload.append('subtitle', form.subtitle)
    payload.append('description', form.description)
    payload.append('image', form.image)
    payload.append('sizes', form.sizes)
    payload.append('featured', String(form.featured))
    payload.append('originUrl', form.originUrl)
    if (selectedFile) payload.append('file', selectedFile)

    const method = form.id ? 'PUT' : 'POST'
    const url = form.id ? `/api/products/${form.id}` : '/api/products'
    const res = await fetch(url, { method, body: payload })
    const data = await res.json().catch(() => ({}))

    if (res.ok) {
      setMessage(form.id ? 'Producto actualizado.' : 'Producto creado.')
      setSelectedFile(null)
      setForm(emptyForm)
      setAdminOpen(false)
      fetchProducts()
    } else {
      setMessage(data.message || 'No se pudo guardar el producto.')
    }
    setSaving(false)
  }

  async function handleSaveSettings(event) {
    event.preventDefault()
    setSettingsSaving(true)
    setSettingsMessage('')

    const next = { ...settingsForm }
    try {
      const heroImageFile = event.currentTarget.heroImageFile.files?.[0]
      const logoFile = event.currentTarget.logoFile.files?.[0]
      if (heroImageFile) next.heroImage = await readFileAsDataURL(heroImageFile)
      if (logoFile) next.logoUrl = await readFileAsDataURL(logoFile)
    } catch {
      setSettingsMessage('No se pudo leer una de las imágenes.')
      setSettingsSaving(false)
      return
    }

    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next)
    })
    const data = await res.json().catch(() => ({}))

    if (res.ok) {
      setSettings(data)
      setSettingsForm(data)
      setSettingsMessage('Diseño actualizado.')
      setDesignOpen(false)
    } else {
      setSettingsMessage(data.message || 'No se pudo guardar el diseño.')
    }
    setSettingsSaving(false)
  }

  async function handleDelete(id) {
    const ok = window.confirm('¿Eliminar este producto del catálogo?')
    if (!ok) return
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setCart((current) => current.filter((item) => item.id !== id))
      fetchProducts()
    }
  }

  async function handleCheckout() {
    if (!cart.length) return
    setCheckoutLoading(true)
    setCheckoutMessage('')
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cart })
      })
      const data = await res.json()
      if (!res.ok) {
        setCheckoutMessage(data.message || 'No se pudo iniciar el checkout.')
      } else if (data.url) {
        window.location.href = data.url
      }
    } catch {
      setCheckoutMessage('Error de red al conectar con el checkout.')
    }
    setCheckoutLoading(false)
  }

  const bestPrice = products.reduce((acc, item) => Math.min(acc, item.price), products[0]?.price || 0)
  const installHint = settings.mobileAppText || 'En móvil, abre Safari y pulsa “Añadir a pantalla de inicio” para instalar la app.'
  const heroImage = settings.heroImage || defaultSettings.heroImage
  const logo = settings.logoUrl || ''

  return (
    <div className="page-shell">
      <div className="announcement">{settings.announcement}</div>
      <div className="page">
        <header className="hero surface-card">
          <nav className="nav">
            <div className="brand-wrap">
              {logo ? <img className="brand-logo" src={logo} alt={settings.brandName} /> : <div className="brand-mark">NWT</div>}
              <div>
                <p className="brand-eyebrow">{settings.tagline}</p>
                <h1 className="brand">{settings.brandName}</h1>
                <p className="brand-sub">{settings.sinceText}</p>
              </div>
            </div>
            <div className="nav-actions">
              <button className="ghost-button" onClick={openDesignEditor}>Diseño</button>
              <button className="ghost-button" onClick={openCreate}>Admin</button>
              <button className="cart-pill" onClick={() => document.getElementById('cart')?.scrollIntoView({ behavior: 'smooth' })}>
                Carrito <span>{cart.reduce((acc, item) => acc + item.quantity, 0)}</span>
              </button>
            </div>
          </nav>

          <div className="hero-grid">
            <div className="hero-copy">
              <p className="eyebrow">{settings.promoText}</p>
              <h2>{settings.heroTitle}</h2>
              <p>{settings.heroText}</p>
              <div className="hero-actions">
                <button className="primary-button" onClick={() => document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' })}>
                  Ver catálogo
                </button>
                <button className="secondary-button" onClick={() => document.getElementById('mobile')?.scrollIntoView({ behavior: 'smooth' })}>
                  App iPhone / Android
                </button>
              </div>
              <div className="stats-grid">
                <div>
                  <strong>{products.length}</strong>
                  <span>productos importados</span>
                </div>
                <div>
                  <strong>{featuredProducts.length}</strong>
                  <span>destacados</span>
                </div>
                <div>
                  <strong>{currency.format(bestPrice || 0)}</strong>
                  <span>precio desde</span>
                </div>
              </div>
            </div>
            <div className="hero-media">
              <img src={heroImage} alt="Portada NO WORK TEAM" />
              <div className="hero-overlay surface-card">
                <p>Stripe test activo</p>
                <strong>Checkout preparado</strong>
                <span>{installHint}</span>
              </div>
            </div>
          </div>
        </header>

        <section className="section surface-card compact-strip">
          <div>
            <p className="eyebrow">Selección</p>
            <h3>Estilo más limpio, catálogo más amplio y base móvil lista para crecer.</h3>
          </div>
          <div className="strip-points">
            <span>Importación inicial de tu catálogo</span>
            <span>Fotos públicas de producto</span>
            <span>Editor visual</span>
            <span>Checkout de prueba</span>
          </div>
        </section>

        <section className="section" id="catalogo">
          <div className="section-head">
            <div>
              <p className="eyebrow">Colección</p>
              <h3>Catálogo NWT</h3>
            </div>
            <div className="search-wrap">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Busca por nombre, badge o descripción"
              />
            </div>
          </div>

          <div className="category-row">
            {categories.map((item) => (
              <button
                key={item}
                className={`category-chip ${item === category ? 'active' : ''}`}
                onClick={() => setCategory(item)}
              >
                {item} <span>{categoryCounts[item] || 0}</span>
              </button>
            ))}
          </div>

          <div className="featured-scroll">
            {featuredProducts.map((product) => (
              <article key={product.id} className="featured-card surface-card">
                <img src={product.image} alt={product.name} />
                <div>
                  <p className="eyebrow">{product.badge}</p>
                  <h4>{product.name}</h4>
                  <p>{currency.format(product.price)}</p>
                </div>
                <button className="link-button" onClick={() => setSelectedProduct(product)}>Ver ficha</button>
              </article>
            ))}
          </div>

          <div className="catalog-grid">
            {filteredProducts.map((product) => (
              <article key={product.id} className="product-card surface-card">
                <div className="product-image-wrap" onClick={() => setSelectedProduct(product)}>
                  <img src={product.image} alt={product.name} />
                  <span className="badge">{product.badge}</span>
                </div>
                <div className="product-info">
                  <p className="muted">{product.subtitle}</p>
                  <h4>{product.name}</h4>
                  <p className="description">{product.description}</p>
                </div>
                <div className="product-footer">
                  <div>
                    <strong>{currency.format(product.price)}</strong>
                    <span>Stock: {product.stock}</span>
                  </div>
                  <div className="card-actions">
                    <button className="ghost-button small" onClick={() => openEdit(product)}>Editar</button>
                    <button className="primary-button small" onClick={() => addToCart(product)}>Añadir</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="section story-grid">
          <article className="surface-card story-card">
            <p className="eyebrow">Checkout</p>
            <h3>Pagos con tarjeta en modo prueba</h3>
            <p>La app ya trae el endpoint de Stripe test para redirigir a Checkout. Solo tienes que añadir las claves de prueba en el servidor para activarlo.</p>
            <ul>
              <li>STRIPE_SECRET_KEY</li>
              <li>PUBLIC_BASE_URL</li>
            </ul>
          </article>
          <article className="surface-card story-card" id="mobile">
            <p className="eyebrow">Mobile</p>
            <h3>Lista para iPhone y Android</h3>
            <p>Se incluye configuración base de Capacitor para empaquetar esta misma app como aplicación nativa cuando quieras dar el siguiente paso.</p>
            <ul>
              <li>ios / android vía Capacitor</li>
              <li>misma base React</li>
              <li>PWA instalable desde Safari y Chrome</li>
            </ul>
          </article>
        </section>

        <section className="section checkout-grid">
          <article id="cart" className="surface-card cart-card">
            <div className="section-head">
              <div>
                <p className="eyebrow">Carrito</p>
                <h3>Tu selección</h3>
              </div>
              <span className="muted">{cart.length} líneas</span>
            </div>
            {cart.length === 0 ? (
              <p className="empty-state">Todavía no has añadido productos.</p>
            ) : (
              <div className="cart-list">
                {cart.map((item) => (
                  <div key={item.id} className="cart-row">
                    <img src={item.image} alt={item.name} />
                    <div className="cart-copy">
                      <strong>{item.name}</strong>
                      <span>{currency.format(item.price)}</span>
                    </div>
                    <div className="qty-row">
                      <button onClick={() => updateQuantity(item.id, -1)}>-</button>
                      <span>{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)}>+</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>

          <aside className="surface-card summary-card">
            <p className="eyebrow">Resumen</p>
            <h3>Total</h3>
            <div className="summary-row"><span>Subtotal</span><strong>{currency.format(subtotal)}</strong></div>
            <div className="summary-row"><span>Envío</span><strong>{currency.format(shipping)}</strong></div>
            <div className="summary-row total"><span>Total</span><strong>{currency.format(total)}</strong></div>
            <button className="primary-button wide" disabled={!cart.length || checkoutLoading} onClick={handleCheckout}>
              {checkoutLoading ? 'Conectando…' : 'Pagar con tarjeta'}
            </button>
            {checkoutMessage && <p className="notice">{checkoutMessage}</p>}
            <p className="muted small">Usa este checkout en modo prueba con tu clave secreta de Stripe test.</p>
          </aside>
        </section>
      </div>

      {selectedProduct && (
        <div className="modal-backdrop" onClick={() => setSelectedProduct(null)}>
          <div className="modal product-modal surface-card" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedProduct(null)}>×</button>
            <div className="product-modal-grid">
              <img src={selectedProduct.image} alt={selectedProduct.name} />
              <div>
                <p className="eyebrow">{selectedProduct.subtitle}</p>
                <h3>{selectedProduct.name}</h3>
                <p>{selectedProduct.description}</p>
                <div className="product-meta">
                  <span>{currency.format(selectedProduct.price)}</span>
                  <span>{selectedProduct.category}</span>
                  <span>Tallas: {formatSizes(selectedProduct.sizes).join(', ')}</span>
                </div>
                <div className="hero-actions">
                  <button className="primary-button" onClick={() => addToCart(selectedProduct)}>Añadir al carrito</button>
                  {selectedProduct.originUrl ? <a className="ghost-button as-link" href={selectedProduct.originUrl} target="_blank" rel="noreferrer">Ver origen</a> : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {adminOpen && (
        <div className="modal-backdrop" onClick={() => setAdminOpen(false)}>
          <div className="modal surface-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <h3>{form.id ? 'Editar producto' : 'Nuevo producto'}</h3>
              <button className="modal-close" onClick={() => setAdminOpen(false)}>×</button>
            </div>
            <form className="form-grid" onSubmit={handleSubmit}>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre" required />
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {categories.filter((item) => item !== 'Todos').map((item) => <option key={item}>{item}</option>)}
              </select>
              <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Precio" required />
              <input value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} placeholder="Stock" required />
              <input value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} placeholder="Badge" />
              <input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} placeholder="Subtitle" />
              <input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="URL de imagen" />
              <input value={form.originUrl || ''} onChange={(e) => setForm({ ...form, originUrl: e.target.value })} placeholder="URL de origen" />
              <input value={form.sizes} onChange={(e) => setForm({ ...form, sizes: e.target.value })} placeholder="Tallas separadas por coma" />
              <label className="file-input">
                Subir imagen
                <input type="file" accept="image/*" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
              </label>
              <label className="checkbox-row">
                <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} />
                Destacado
              </label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descripción" rows="4" required />
              <div className="form-actions">
                {form.id ? <button type="button" className="danger-button" onClick={() => handleDelete(form.id)}>Eliminar</button> : <span />}
                <button className="primary-button" type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar producto'}</button>
              </div>
              {message && <p className="notice">{message}</p>}
            </form>
          </div>
        </div>
      )}

      {designOpen && (
        <div className="modal-backdrop" onClick={() => setDesignOpen(false)}>
          <div className="modal surface-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <h3>Editor visual</h3>
              <button className="modal-close" onClick={() => setDesignOpen(false)}>×</button>
            </div>
            <form className="form-grid" onSubmit={handleSaveSettings}>
              <input value={settingsForm.brandName} onChange={(e) => setSettingsForm({ ...settingsForm, brandName: e.target.value })} placeholder="Marca" />
              <input value={settingsForm.tagline} onChange={(e) => setSettingsForm({ ...settingsForm, tagline: e.target.value })} placeholder="Tagline" />
              <input value={settingsForm.sinceText} onChange={(e) => setSettingsForm({ ...settingsForm, sinceText: e.target.value })} placeholder="Desde" />
              <input value={settingsForm.primaryColor} onChange={(e) => setSettingsForm({ ...settingsForm, primaryColor: e.target.value })} placeholder="#color primario" />
              <input value={settingsForm.secondaryColor} onChange={(e) => setSettingsForm({ ...settingsForm, secondaryColor: e.target.value })} placeholder="#color secundario" />
              <input value={settingsForm.backgroundColor} onChange={(e) => setSettingsForm({ ...settingsForm, backgroundColor: e.target.value })} placeholder="#fondo" />
              <input value={settingsForm.cardColor} onChange={(e) => setSettingsForm({ ...settingsForm, cardColor: e.target.value })} placeholder="#tarjeta" />
              <input value={settingsForm.textColor} onChange={(e) => setSettingsForm({ ...settingsForm, textColor: e.target.value })} placeholder="#texto" />
              <input value={settingsForm.heroImage} onChange={(e) => setSettingsForm({ ...settingsForm, heroImage: e.target.value })} placeholder="URL imagen principal" />
              <input value={settingsForm.logoUrl} onChange={(e) => setSettingsForm({ ...settingsForm, logoUrl: e.target.value })} placeholder="URL logo" />
              <input value={settingsForm.promoText} onChange={(e) => setSettingsForm({ ...settingsForm, promoText: e.target.value })} placeholder="Texto promo" />
              <input value={settingsForm.announcement || ''} onChange={(e) => setSettingsForm({ ...settingsForm, announcement: e.target.value })} placeholder="Announcement" />
              <input value={settingsForm.mobileAppText || ''} onChange={(e) => setSettingsForm({ ...settingsForm, mobileAppText: e.target.value })} placeholder="Texto mobile" />
              <input value={settingsForm.instagramHandle || ''} onChange={(e) => setSettingsForm({ ...settingsForm, instagramHandle: e.target.value })} placeholder="Instagram" />
              <label className="file-input">Subir hero image<input name="heroImageFile" type="file" accept="image/*" /></label>
              <label className="file-input">Subir logo<input name="logoFile" type="file" accept="image/*" /></label>
              <textarea value={settingsForm.heroTitle} onChange={(e) => setSettingsForm({ ...settingsForm, heroTitle: e.target.value })} placeholder="Título hero" rows="2" />
              <textarea value={settingsForm.heroText} onChange={(e) => setSettingsForm({ ...settingsForm, heroText: e.target.value })} placeholder="Texto hero" rows="3" />
              <div className="form-actions">
                <span />
                <button className="primary-button" type="submit" disabled={settingsSaving}>{settingsSaving ? 'Guardando…' : 'Guardar diseño'}</button>
              </div>
              {settingsMessage && <p className="notice">{settingsMessage}</p>}
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
