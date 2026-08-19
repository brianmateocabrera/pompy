const CONFIG = {
  apiEndpoint: '/api/crud',
  filePath: 'data.json'
};

// Estado Reactivo Local
const Store = {
  state: {
    usuario: {},
    metricas_generales: {},
    categorias: [],
    inventario: []
  },
  sha: null, // Requerido por GitHub API para actualizar archivos

  // Cargar estado inicial desde la API
  async init() {
    try {
      const res = await fetch(CONFIG.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'GET', path: CONFIG.filePath })
      });
      const result = await res.json();
      
      if (result.success) {
        this.state = result.data;
        this.sha = result.sha;
        this.render();
      } else {
        alert('Error al leer data.json: ' + result.message);
      }
    } catch (err) {
      console.error('Error de conexión:', err);
    }
  },

  // Guardar estado en GitHub
  async persist(commitMessage = 'Actualización desde Dashboard') {
    try {
      const res = await fetch(CONFIG.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'PUT',
          path: CONFIG.filePath,
          message: commitMessage,
          content: JSON.stringify(this.state, null, 2),
          sha: this.sha
        })
      });
      const result = await res.json();
      if (result.success) {
        this.sha = result.sha; // Actualizar SHA retornado por GitHub
      } else {
        alert('Error al guardar en GitHub: ' + result.error);
      }
    } catch (err) {
      console.error('Error al persistir cambios:', err);
    }
  },

  // Mutaciones
  saveProduct(product) {
    const index = this.state.inventario.findIndex(p => p.id === product.id);
    if (index >= 0) {
      this.state.inventario[index] = product;
    } else {
      this.state.inventario.push(product);
    }
    this.state.metricas_generales.productos_totales = this.state.inventario.length;
    this.render();
    this.persist(`Producto ${product.nombre} guardado`);
  },

  deleteProduct(id) {
    this.state.inventario = this.state.inventario.filter(p => p.id !== id);
    this.state.metricas_generales.productos_totales = this.state.inventario.length;
    this.render();
    this.persist(`Producto ${id} eliminado`);
  },

  // Renderizado Reactivo
  render() {
    const { usuario, metricas_generales, categorias, inventario } = this.state;

    // Perfil
    document.getElementById('usr-avatar').textContent = usuario.iniciales || 'JS';
    document.getElementById('usr-name').textContent = usuario.nombre || 'Usuario';
    document.getElementById('usr-role').textContent = usuario.rol || 'Admin';

    // Métricas
    document.getElementById('st-ventas').textContent = `$${(metricas_generales.ventas_totales || 0).toFixed(2)}`;
    document.getElementById('st-pedidos').textContent = metricas_generales.pedidos || 0;
    document.getElementById('st-productos').textContent = metricas_generales.productos_totales || 0;
    document.getElementById('st-clientes').textContent = metricas_generales.clientes || 0;

    // Categorías
    const catContainer = document.getElementById('cat-container');
    catContainer.innerHTML = (categorias || []).map(cat => `
      <div class="category-admin-card">
        <div class="category-admin-icon"><i class="fa-solid ${cat.icono}"></i></div>
        <span class="category-admin-name">${escapeHTML(cat.nombre)}</span>
        <span class="category-admin-count">${cat.cantidad_items} items</span>
      </div>
    `).join('');

    // Inventario
    const invContainer = document.getElementById('inv-container');
    invContainer.innerHTML = (inventario || []).map(item => {
      const isActivo = item.estado.toLowerCase() === 'activo';
      return `
        <div class="admin-item-card">
          <div class="item-info">
            <div class="item-name">${escapeHTML(item.nombre)}</div>
            <div class="item-meta">
              <span class="item-price">$${Number(item.precio).toFixed(2)}</span>
              <span class="badge ${isActivo ? 'badge-success' : 'badge-warning'}">${escapeHTML(item.estado)}</span>
            </div>
          </div>
          <div class="item-actions">
            <i class="fa-solid fa-pen action-edit" onclick="UI.openModal('${item.id}')"></i>
            <i class="fa-solid fa-trash action-delete" onclick="UI.deleteProduct('${item.id}')"></i>
          </div>
        </div>
      `;
    }).join('');
  }
};

// Manejo de Interfaz de Usuario (Modales / Eventos)
const UI = {
  modal: document.getElementById('modal-product'),
  
  openModal(id = null) {
    const title = document.getElementById('modal-title');
    const inputId = document.getElementById('prod-id');
    const inputName = document.getElementById('prod-name');
    const inputPrice = document.getElementById('prod-price');
    const selectStatus = document.getElementById('prod-status');

    if (id) {
      const prod = Store.state.inventario.find(p => p.id === id);
      if (!prod) return;
      title.textContent = 'Editar Producto';
      inputId.value = prod.id;
      inputName.value = prod.nombre;
      inputPrice.value = prod.precio;
      selectStatus.value = prod.estado;
    } else {
      title.textContent = 'Nuevo Producto';
      inputId.value = `prod-${Date.now()}`;
      inputName.value = '';
      inputPrice.value = '';
      selectStatus.value = 'Activo';
    }

    this.modal.classList.add('active');
  },

  closeModal() {
    this.modal.classList.remove('active');
  },

  saveModal() {
    const id = document.getElementById('prod-id').value;
    const nombre = document.getElementById('prod-name').value.trim();
    const precio = parseFloat(document.getElementById('prod-price').value);
    const estado = document.getElementById('prod-status').value;

    if (!nombre || isNaN(precio)) {
      alert('Ingresá datos válidos.');
      return;
    }

    Store.saveProduct({ id, nombre, precio, moneda: 'USD', estado });
    this.closeModal();
  },

  deleteProduct(id) {
    if (confirm('¿Eliminar este producto del inventario?')) {
      Store.deleteProduct(id);
    }
  }
};

// Event Listeners
document.getElementById('btn-add-product').addEventListener('click', () => UI.openModal());
document.getElementById('btn-modal-cancel').addEventListener('click', () => UI.closeModal());
document.getElementById('btn-modal-save').addEventListener('click', () => UI.saveModal());

function escapeHTML(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => Store.init());