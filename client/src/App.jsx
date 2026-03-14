import { useEffect, useMemo, useState } from 'react'

const currency = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })
const categories = ['Todos', 'Camisetas hombre', 'Camisetas mujer', 'Sudaderas unisex', 'Chaquetas', 'Gorras y sombreros', 'Lycras unisex', 'Niño/a']
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
  featured: false
}
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

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
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
  const [message, setMessage] = useState('')
  const [settingsMessage, setSettingsMessage] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [selectedFile, setSelectedFile] = useState(null)
  const [settings, setSettings] = useState(defaultSettings)
  const [settingsForm, setSettingsForm] = useState(defaultSettings)

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

  const featuredProducts = useMemo(() => products.filter((item) => item.featured).slice(0, 4), [products])

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

  function addToCart(product) {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id)
      if (existing) return current.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
      return [...current, { ...product, quantity: 1 }]
    })
  }

  function updateQuantity(id, delta) {
    setCart((current) => current.map((item) => item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item).filter((item) => item.quantity > 0))
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
      sizes: Array.isArray(product.sizes) ? product.sizes.join(', ') : product.sizes || ''
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

  const installHint = 'En móvil, abre Safari y pulsa “Añadir a pantalla de inicio” para instalar la app.'
  const heroImage = settings.heroImage || 'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?auto=format&fit=crop&w=1200&q=80'
  const logo = settings.logoUrl || ''

  return (
    <div className="page">
      <header className="hero">
        <div className="topline">
          <span>{settings.brandName}</span>
          <span>{settings.tagline}</span>
          <span>{settings.sinceText}</span>
        </div>
        <nav className="nav">
          <div className="brand-wrap">
            {logo ? <img src={logo} alt={settings.brandName} className="brand-logo" /> : null}
            <div>
              <p className="brand">{settings.brandName}</p>
              <p className="brand-sub">{settings.tagline.toLowerCase()} · app móvil</p>
            </div>
          </div>
          <div className="nav-actions">
            <button className="ghost" onClick={() => document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' })}>Colección</button>
            <button className="secondary" onClick={openDesignEditor}>Diseño</button>
            <button className="primary" onClick={openCreate}>Admin</button>
          </div>
        </nav>

        <section className="hero-grid">
          <div>
            <p className="eyebrow">Personalizable desde la app</p>
            <h1>{settings.heroTitle}</h1>
            <p className="hero-copy">{settings.heroText}</p>
            <div className="hero-buttons row">
              <button className="primary" onClick={() => document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' })}>Ver colección</button>
              <button className="secondary" onClick={openDesignEditor}>Editar diseño</button>
            </div>
            <div className="metrics row">
              <article><strong>{products.length}</strong><span>productos cargados</span></article>
              <article><strong>Editor</strong><span>cambia colores, logo y portada</span></article>
              <article><strong>PWA</strong><span>instalable en móvil</span></article>
            </div>
          </div>

          <div className="hero-card">
            <div className="hero-badge-row row">
              <span className="pill">Diseños únicos</span>
              <span className="pill muted">Personalizable</span>
            </div>
            <div className="hero-gallery custom-hero-gallery">
              <div className="photo tall" style={{ backgroundImage: `linear-gradient(180deg, rgba(12,11,9,0.15), rgba(12,11,9,0.48)), url('${heroImage}')` }}></div>
              <div className="stack">
                <div className="promo-card surface-card">
                  <p>{settings.tagline}</p>
                  <strong>{settings.promoText}</strong>
                  <span>{installHint}</span>
                </div>
                <div className="mini-card">
                  <p>Portada editable</p>
                  <strong>Sube tu imagen y cambia el mensaje principal</strong>
                  <span>También puedes cambiar colores, logo y textos sin tocar código.</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </header>

      <main className="layout">
        <section className="content" id="catalogo">
          <div className="section-head row-between">
            <div>
              <p className="eyebrow">Productos</p>
              <h2>Catálogo editable</h2>
            </div>
            <p className="muted">Ahora también puedes personalizar la portada, los colores y el branding desde el panel de diseño.</p>
          </div>

          <div className="featured-grid">
            {featuredProducts.map((product) => (
              <article className="featured-card surface-card" key={`featured-${product.id}`}>
                <img src={product.image} alt={product.name} />
                <div>
                  <span className="small">{product.subtitle}</span>
                  <h3>{product.name}</h3>
                  <p>{currency.format(product.price)}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="filters row">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar diseño, colección o badge" />
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>

          <div className="product-grid">
            {filteredProducts.map((product) => (
              <article className="product-card surface-card" key={product.id}>
                <div className="product-image-wrap">
                  <img src={product.image} alt={product.name} />
                  <span className="pill product-pill">{product.badge}</span>
                </div>
                <div className="product-body">
                  <p className="small">{product.subtitle}</p>
                  <h3>{product.name}</h3>
                  <p className="description">{product.description}</p>
                  <div className="meta-row row-between">
                    <span>{currency.format(product.price)}</span>
                    <span>Stock {product.stock}</span>
                  </div>
                  <p className="sizes">Tallas: {Array.isArray(product.sizes) ? product.sizes.join(', ') : product.sizes}</p>
                  <div className="card-actions row">
                    <button className="secondary" onClick={() => addToCart(product)}>Añadir</button>
                    <button className="ghost" onClick={() => openEdit(product)}>Editar</button>
                    <button className="ghost danger" onClick={() => handleDelete(product.id)}>Borrar</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="sidebar">
          <section className="cart-card surface-card">
            <div className="section-head compact">
              <div>
                <p className="eyebrow">Carrito</p>
                <h2>Resumen</h2>
              </div>
            </div>
            {cart.length === 0 ? <p className="muted">Aún no hay productos en la cesta.</p> : null}
            <div className="cart-items">
              {cart.map((item) => (
                <article className="cart-item" key={item.id}>
                  <img src={item.image} alt={item.name} />
                  <div>
                    <strong>{item.name}</strong>
                    <p>{currency.format(item.price)}</p>
                    <div className="qty-row row">
                      <button onClick={() => updateQuantity(item.id, -1)}>-</button>
                      <span>{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)}>+</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <div className="summary">
              <div className="row-between"><span>Subtotal</span><strong>{currency.format(subtotal)}</strong></div>
              <div className="row-between"><span>Envío</span><strong>{shipping === 0 ? 'Gratis' : currency.format(shipping)}</strong></div>
              <div className="row-between total"><span>Total</span><strong>{currency.format(total)}</strong></div>
            </div>
            <button className="primary full">Finalizar pedido</button>
          </section>

          <section className="admin-note surface-card">
            <p className="eyebrow">Paneles</p>
            <h3>Ahora puedes gestionar diseño y catálogo</h3>
            <ul>
              <li>Productos con imagen, stock y destacados</li>
              <li>Color principal, fondos y textos</li>
              <li>Logo, portada y mensajes de marca</li>
            </ul>
          </section>
        </aside>
      </main>

      {adminOpen ? (
        <div className="modal-backdrop" onClick={() => setAdminOpen(false)}>
          <div className="modal surface-card" onClick={(e) => e.stopPropagation()}>
            <div className="section-head row-between compact">
              <div>
                <p className="eyebrow">Admin</p>
                <h2>{form.id ? 'Editar producto' : 'Nuevo producto'}</h2>
              </div>
              <button className="ghost" onClick={() => setAdminOpen(false)}>Cerrar</button>
            </div>
            <form className="admin-form" onSubmit={handleSubmit}>
              <label>Nombre<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
              <label>Categoría<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{categories.slice(1).map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>Precio<input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required /></label>
              <label>Stock<input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} required /></label>
              <label>Badge<input value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} /></label>
              <label>Subtítulo<input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} /></label>
              <label className="full-width">Descripción<textarea rows="4" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required /></label>
              <label>URL imagen<input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="https://..." /></label>
              <label>Subir imagen<input type="file" accept="image/*" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} /></label>
              <label>Tallas<input value={form.sizes} onChange={(e) => setForm({ ...form, sizes: e.target.value })} /></label>
              <label className="checkbox-row"><input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} /> Destacar en portada</label>
              {message ? <p className="muted full-width">{message}</p> : null}
              <div className="row full-width form-actions">
                <button type="button" className="ghost" onClick={() => setAdminOpen(false)}>Cancelar</button>
                <button type="submit" className="primary">{saving ? 'Guardando...' : 'Guardar producto'}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {designOpen ? (
        <div className="modal-backdrop" onClick={() => setDesignOpen(false)}>
          <div className="modal surface-card" onClick={(e) => e.stopPropagation()}>
            <div className="section-head row-between compact">
              <div>
                <p className="eyebrow">Diseño</p>
                <h2>Editor visual de la app</h2>
              </div>
              <button className="ghost" onClick={() => setDesignOpen(false)}>Cerrar</button>
            </div>
            <form className="admin-form" onSubmit={handleSaveSettings}>
              <label>Nombre de marca<input value={settingsForm.brandName} onChange={(e) => setSettingsForm({ ...settingsForm, brandName: e.target.value })} /></label>
              <label>Tagline<input value={settingsForm.tagline} onChange={(e) => setSettingsForm({ ...settingsForm, tagline: e.target.value })} /></label>
              <label>Texto “Desde”<input value={settingsForm.sinceText} onChange={(e) => setSettingsForm({ ...settingsForm, sinceText: e.target.value })} /></label>
              <label>Texto promo<input value={settingsForm.promoText} onChange={(e) => setSettingsForm({ ...settingsForm, promoText: e.target.value })} /></label>
              <label className="full-width">Título portada<input value={settingsForm.heroTitle} onChange={(e) => setSettingsForm({ ...settingsForm, heroTitle: e.target.value })} /></label>
              <label className="full-width">Texto portada<textarea rows="4" value={settingsForm.heroText} onChange={(e) => setSettingsForm({ ...settingsForm, heroText: e.target.value })} /></label>
              <label>Color principal<input type="color" value={settingsForm.primaryColor} onChange={(e) => setSettingsForm({ ...settingsForm, primaryColor: e.target.value })} /></label>
              <label>Color secundario<input type="color" value={settingsForm.secondaryColor} onChange={(e) => setSettingsForm({ ...settingsForm, secondaryColor: e.target.value })} /></label>
              <label>Fondo<input type="color" value={settingsForm.backgroundColor} onChange={(e) => setSettingsForm({ ...settingsForm, backgroundColor: e.target.value })} /></label>
              <label>Tarjetas<input type="color" value={settingsForm.cardColor} onChange={(e) => setSettingsForm({ ...settingsForm, cardColor: e.target.value })} /></label>
              <label>Texto<input type="color" value={settingsForm.textColor} onChange={(e) => setSettingsForm({ ...settingsForm, textColor: e.target.value })} /></label>
              <label>URL del logo<input value={settingsForm.logoUrl} onChange={(e) => setSettingsForm({ ...settingsForm, logoUrl: e.target.value })} placeholder="https://..." /></label>
              <label className="full-width">URL imagen portada<input value={settingsForm.heroImage} onChange={(e) => setSettingsForm({ ...settingsForm, heroImage: e.target.value })} placeholder="https://..." /></label>
              <label>Subir logo<input type="file" name="logoFile" accept="image/*" /></label>
              <label>Subir imagen portada<input type="file" name="heroImageFile" accept="image/*" /></label>
              {settingsMessage ? <p className="muted full-width">{settingsMessage}</p> : null}
              <div className="row full-width form-actions">
                <button type="button" className="ghost" onClick={() => {
                  setSettingsForm(defaultSettings)
                }}>Restaurar base</button>
                <button type="submit" className="primary">{settingsSaving ? 'Guardando...' : 'Guardar diseño'}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
