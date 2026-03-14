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

export default function App() {
  const [products, setProducts] = useState([])
  const [cart, setCart] = useState([])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Todos')
  const [adminOpen, setAdminOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [selectedFile, setSelectedFile] = useState(null)

  useEffect(() => {
    fetchProducts()
  }, [])

  async function fetchProducts() {
    const res = await fetch('/api/products')
    const data = await res.json()
    setProducts(data)
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

  async function handleDelete(id) {
    const ok = window.confirm('¿Eliminar este producto del catálogo?')
    if (!ok) return
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setCart((current) => current.filter((item) => item.id !== id))
      fetchProducts()
    }
  }

  const installHint = 'En móvil, abre el menú del navegador y pulsa “Añadir a pantalla de inicio” para instalar la app.'

  return (
    <div className="page">
      <header className="hero">
        <div className="topline">
          <span>NO WORK TEAM</span>
          <span>Surfing Brand</span>
          <span>Desde 1986</span>
        </div>
        <nav className="nav">
          <div>
            <p className="brand">NO WORK TEAM</p>
            <p className="brand-sub">ropa surfera · app móvil</p>
          </div>
          <div className="nav-actions">
            <button className="ghost" onClick={() => document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' })}>Colección</button>
            <button className="primary" onClick={openCreate}>Admin</button>
          </div>
        </nav>

        <section className="hero-grid">
          <div>
            <p className="eyebrow">Inspirada en tu web actual</p>
            <h1>La tienda de NO WORK TEAM en formato app.</h1>
            <p className="hero-copy">
              Mantiene el tono visual de la marca, el mensaje surf lifestyle y un catálogo editable desde panel admin con subida directa de fotos.
            </p>
            <div className="hero-buttons">
              <button className="primary" onClick={() => document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' })}>Ver colección</button>
              <button className="secondary" onClick={() => setAdminOpen(true)}>Gestionar productos</button>
            </div>
            <div className="metrics">
              <article><strong>{products.length}</strong><span>productos cargados</span></article>
              <article><strong>Admin</strong><span>crear, editar y borrar</span></article>
              <article><strong>PWA</strong><span>instalable en móvil</span></article>
            </div>
          </div>

          <div className="hero-card">
            <div className="hero-badge-row">
              <span className="pill">Diseños únicos</span>
              <span className="pill muted">NWT</span>
            </div>
            <div className="hero-gallery">
              <div className="photo tall"></div>
              <div className="stack">
                <div className="photo sun"></div>
                <div className="mini-card">
                  <p>Instalable</p>
                  <strong>Tu catálogo en pantalla de inicio</strong>
                  <span>{installHint}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </header>

      <main className="layout">
        <section className="content" id="catalogo">
          <div className="section-head">
            <div>
              <p className="eyebrow">Productos</p>
              <h2>Catálogo editable</h2>
            </div>
            <p className="muted">Categorías y producto iniciales cargados a partir de tu web actual.</p>
          </div>

          <div className="featured-grid">
            {featuredProducts.map((product) => (
              <article className="featured-card" key={`featured-${product.id}`}>
                <img src={product.image} alt={product.name} />
                <div>
                  <span className="small">{product.subtitle}</span>
                  <h3>{product.name}</h3>
                  <p>{currency.format(product.price)}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="filters">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar diseño, colección o badge" />
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>

          <div className="product-grid">
            {filteredProducts.map((product) => (
              <article className="product-card" key={product.id}>
                <div className="product-image-wrap">
                  <img src={product.image} alt={product.name} />
                  <span className="pill product-pill">{product.badge}</span>
                </div>
                <div className="product-body">
                  <p className="small">{product.subtitle}</p>
                  <h3>{product.name}</h3>
                  <p className="description">{product.description}</p>
                  <div className="meta-row">
                    <span>{currency.format(product.price)}</span>
                    <span>Stock {product.stock}</span>
                  </div>
                  <p className="sizes">Tallas: {Array.isArray(product.sizes) ? product.sizes.join(', ') : product.sizes}</p>
                  <div className="card-actions">
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
          <section className="cart-card">
            <div className="section-head compact">
              <div>
                <p className="eyebrow">Carrito</p>
                <h2>Resumen</h2>
              </div>
            </div>
            {cart.length === 0 ? <p className="muted">Aún no hay productos en la cesta.</p> : null}
            <div className="cart-items">
              {cart.map((item) => (
                <article key={item.id} className="cart-item">
                  <img src={item.image} alt={item.name} />
                  <div>
                    <strong>{item.name}</strong>
                    <p>{currency.format(item.price)}</p>
                    <div className="qty-row">
                      <button onClick={() => updateQuantity(item.id, -1)}>-</button>
                      <span>{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)}>+</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <div className="summary">
              <div><span>Subtotal</span><strong>{currency.format(subtotal)}</strong></div>
              <div><span>Envío</span><strong>{shipping === 0 ? 'Gratis' : currency.format(shipping)}</strong></div>
              <div className="total"><span>Total</span><strong>{currency.format(total)}</strong></div>
            </div>
            <button className="primary full">Checkout preparado</button>
          </section>

          <section className="admin-note">
            <p className="eyebrow">Panel</p>
            <h3>Qué puedes hacer ya</h3>
            <ul>
              <li>Crear producto con imagen por URL o archivo</li>
              <li>Editar precio, stock, texto y tallas</li>
              <li>Borrar artículos del catálogo</li>
              <li>Marcar destacados para portada</li>
              <li>Instalar la app como PWA</li>
            </ul>
          </section>
        </aside>
      </main>

      {adminOpen ? (
        <div className="modal-backdrop" onClick={() => setAdminOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="section-head compact">
              <div>
                <p className="eyebrow">Admin</p>
                <h2>{form.id ? 'Editar producto' : 'Añadir producto'}</h2>
              </div>
              <button className="ghost" onClick={() => setAdminOpen(false)}>Cerrar</button>
            </div>
            <form className="admin-form" onSubmit={handleSubmit}>
              <label>Nombre<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
              <label>Categoría<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{categories.filter((item) => item !== 'Todos').map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>Precio<input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required /></label>
              <label>Stock<input type="number" min="0" step="1" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} required /></label>
              <label>Badge<input value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} /></label>
              <label>Subtítulo<input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} /></label>
              <label className="full-width">Descripción<textarea rows="4" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required /></label>
              <label className="full-width">URL imagen<input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="https://... o déjalo vacío si subes archivo" /></label>
              <label className="full-width">Subir archivo<input type="file" accept="image/*" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} /></label>
              <label className="full-width">Tallas<input value={form.sizes} onChange={(e) => setForm({ ...form, sizes: e.target.value })} placeholder="S, M, L, XL" /></label>
              <label className="checkbox-row"><input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} /> Destacar en portada</label>
              <button className="primary full" disabled={saving}>{saving ? 'Guardando...' : form.id ? 'Guardar cambios' : 'Crear producto'}</button>
              {message ? <p className="muted full-width">{message}</p> : null}
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
