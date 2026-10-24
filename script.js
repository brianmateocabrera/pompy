const CSV_URL = `https://docs.google.com/spreadsheets/d/e/2PACX-1vSkSU4sulQVpPVoKbFAq2-UKRYzDUSlWU6pNgxRyFV1XTtJJXUlIXogtao6Q9JIFJtG5i9jqheP6Nao/pub?output=csv`;
const PAGE_SIZE = 12;

let rawProducts = [];
let filteredProducts = [];
let currentPage = 1;
let wishlist = JSON.parse(localStorage.getItem('pompy_boutinela_wishlist') || '[]');
let filterKeys = ['category', 'subCategory', 'brand'];

function parseCSV(text) {
  const lines = text.split('\n');
  const result = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.replace(/^"|"$/g, '').trim());
    result.push(row);
  }
  return result;
}

async function fetchProducts() {
  try {
    const response = await fetch(CSV_URL);
    const data = await response.text();
    const rows = parseCSV(data);

    rawProducts = rows.map((r, index) => {
      const rawPrice = (r[6] || '').replace(/[^0-9]/g, '');
      const price = rawPrice ? parseInt(rawPrice, 10) : 0;
      const rawOldPrice = (r[7] || '').replace(/[^0-9]/g, '');
      const oldPrice = rawOldPrice ? parseInt(rawOldPrice, 10) : 0;

      let imgName = (r[8] || '').trim();
      if (imgName && !imgName.includes('.')) {
        imgName += '.jpg';
      }
      const imgSrc = imgName ? `imagenes/${imgName}` : 'https://placehold.co/600x800?text=Sin+Imagen';

      return {
        originalIndex: index,
        id: r[0] || `prod-${index}`,
        category: r[1] || 'GENERAL',
        subCategory: r[2] || 'OTROS',
        brand: r[3] || 'SIN MARCA',
        model: r[4] || '',
        name: r[5] || 'Producto sin nombre',
        price: price,
        oldPrice: oldPrice,
        image: imgSrc,
        badge: r[13] || '',
        visible: (r[14] || 'TRUE').toUpperCase() === 'TRUE'
      };
    }).filter(p => p.visible && p.name && p.price > 0);

    buildDynamicSidebar();
    applyFilters();
    updateWishlistBadge();
  } catch (err) {
    console.error("Error al cargar la base de datos:", err);
    document.getElementById('productsGrid').innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #d90429;">
        Error al cargar los productos desde la base de datos.
      </div>`;
  }
}

function buildDynamicSidebar() {
  const container = document.getElementById('dynamicSidebarNav');
  container.innerHTML = '';

  const labels = { category: 'Categorías', subCategory: 'Línea / Subcategoría', brand: 'Marcas' };

  filterKeys.forEach(key => {
    const values = [...new Set(rawProducts.map(p => p[key]))].filter(Boolean).sort();
    if (values.length === 0) return;

    const navItemHtml = `
      <div class="nav-acc-item">
        <button class="nav-acc-btn" onclick="toggleAccordion(this)">
          ${labels[key]} <span>+</span>
        </button>
        <div class="nav-acc-content">
          ${values.map(val => `
            <label class="filter-option">
              <input type="checkbox" class="dyn-filter-check" data-key="${key}" value="${val}" onchange="applyFilters()">
              ${val}
            </label>
          `).join('')}
        </div>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', navItemHtml);
  });
}

function toggleAccordion(btn) {
  const content = btn.nextElementSibling;
  const isExpanded = content.classList.contains('active');
  content.classList.toggle('active', !isExpanded);
  btn.querySelector('span').textContent = isExpanded ? '+' : '–';
}

function applyFilters() {
  const activeFilters = {};
  filterKeys.forEach(key => {
    activeFilters[key] = Array.from(document.querySelectorAll(`.dyn-filter-check[data-key="${key}"]:checked`)).map(cb => cb.value);
  });

  const sortOption = document.getElementById('sortSelect').value;
  const searchQuery = document.getElementById('searchInput').value.toLowerCase().trim();

  filteredProducts = rawProducts.filter(p => {
    const matchesFilters = filterKeys.every(key => {
      const selected = activeFilters[key];
      return selected.length === 0 || selected.includes(p[key]);
    });

    const matchesSearch = !searchQuery || 
      p.name.toLowerCase().includes(searchQuery) || 
      p.subCategory.toLowerCase().includes(searchQuery) || 
      p.category.toLowerCase().includes(searchQuery);

    return matchesFilters && matchesSearch;
  });

  if (sortOption === 'default') {
    filteredProducts.sort((a, b) => a.originalIndex - b.originalIndex);
  } else if (sortOption === 'priceLow') {
    filteredProducts.sort((a, b) => a.price - b.price);
  } else if (sortOption === 'priceHigh') {
    filteredProducts.sort((a, b) => b.price - a.price);
  } else if (sortOption === 'nameAZ') {
    filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
  }

  currentPage = 1;
  renderProducts();
}

function renderProducts() {
  const grid = document.getElementById('productsGrid');
  document.getElementById('productCountText').textContent = `${filteredProducts.length} PRODUCTOS DISPONIBLES`;

  if (filteredProducts.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 60px 0; color: #888;">
        No se encontraron productos coincidentes.
      </div>`;
    document.getElementById('loadMoreBtn').classList.add('d-none');
    return;
  }

  const paginated = filteredProducts.slice(0, currentPage * PAGE_SIZE);

  grid.innerHTML = paginated.map(p => {
    const formattedPrice = `$${p.price.toLocaleString('es-AR')}`;
    const formattedOldPrice = p.oldPrice > 0 ? `$${p.oldPrice.toLocaleString('es-AR')}` : '';
    const isFav = wishlist.includes(p.id);

    let badgeHtml = '';
    if (p.badge) {
      badgeHtml = `<span class="badge-tag">${p.badge}</span>`;
    } else if (p.oldPrice > p.price) {
      badgeHtml = `<span class="badge-tag sale">OFFER</span>`;
    }

    const wsNumber = "5493518189444";
    const productUrl = `${window.location.origin}${window.location.pathname}?id=${p.id}`;
    const wsText = encodeURIComponent(`Hola POMPY! Quisiera consultar por el producto: ${p.name} (Ref: ${p.id})\nEnlace: ${productUrl}`);
    const wsUrl = `https://wa.me/${wsNumber}?text=${wsText}`;

    return `
      <div class="product-card">
        <div class="product-media" onclick="openProductModal('${p.id}')">
          ${badgeHtml}
          <button class="fav-btn ${isFav ? 'active' : ''}" onclick="event.stopPropagation(); toggleWishlist('${p.id}')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.78-8.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
          </button>
          <img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.onerror=null; this.src='https://placehold.co/600x600?text=Sin+Imagen';">
        </div>
        <div class="product-info">
          <span class="product-vendor">${p.subCategory}</span>
          <div class="product-title" onclick="openProductModal('${p.id}')">${p.name}</div>
          <div class="price-box">
            ${formattedPrice}
            ${formattedOldPrice ? `<span class="old-price">${formattedOldPrice}</span>` : ''}
          </div>
          <a href="${wsUrl}" target="_blank" class="btn-ws-quick" style="display: flex; align-items: center; justify-content: center; gap: 6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
            CONSULTAR
          </a>
        </div>
      </div>
    `;
  }).join('');

  const loadMoreBtn = document.getElementById('loadMoreBtn');
  if (paginated.length < filteredProducts.length) {
    loadMoreBtn.classList.remove('d-none');
  } else {
    loadMoreBtn.classList.add('d-none');
  }
}

function openProductModal(id) {
  const p = rawProducts.find(item => item.id === id);
  if (!p) return;

  const formattedPrice = `$${p.price.toLocaleString('es-AR')}`;
  const formattedOldPrice = p.oldPrice > 0 ? `$${p.oldPrice.toLocaleString('es-AR')}` : '';
  const wsNumber = "5493518189444";
  const productUrl = `${window.location.origin}${window.location.pathname}?id=${p.id}`;
  const wsText = encodeURIComponent(`Hola POMPY! Quisiera consultar por el producto: ${p.name} (Ref: ${p.id})\nEnlace: ${productUrl}`);

  document.getElementById('modalProductDetails').innerHTML = `
    <div style="text-align: center; margin-bottom: 14px; background: #f7f7f7; padding: 10px;">
      <img src="${p.image}" alt="${p.name}" style="width: 100%; max-height: 280px; object-fit: contain;">
    </div>
    <span style="font-size: 0.6rem; text-transform: uppercase; color: #888;">${p.subCategory}</span>
    <h3 style="font-size: 1rem; font-weight: 800; margin: 4px 0 6px;">${p.name}</h3>
    <p style="font-size: 0.7rem; color: #666; margin-bottom: 10px;">Marca: ${p.brand} | Ref: ${p.id}</p>
    <div style="font-size: 1rem; font-weight: 700; margin-bottom: 14px;">
      ${formattedPrice} ${formattedOldPrice ? `<span style="font-size: 0.8rem; color: #888; text-decoration: line-through; margin-left: 6px;">${formattedOldPrice}</span>` : ''}
    </div>
    <a href="https://wa.me/${wsNumber}?text=${wsText}" target="_blank" class="btn-ws-checkout" style="display: block; text-align: center; text-decoration: none;">CONSULTAR POR WHATSAPP</a>
  `;

  document.getElementById('productModal').classList.add('active');
}

function toggleWishlist(id) {
  if (wishlist.includes(id)) {
    wishlist = wishlist.filter(itemId => itemId !== id);
  } else {
    wishlist.push(id);
  }
  localStorage.setItem('pompy_boutinela_wishlist', JSON.stringify(wishlist));
  updateWishlistBadge();
  renderProducts();
  
  const wishlistModal = document.getElementById('wishlistModal');
  if (wishlistModal.classList.contains('active')) {
    renderWishlistModal();
  }
}

function updateWishlistBadge() {
  document.getElementById('wishlistCount').textContent = wishlist.length;
}

function renderWishlistModal() {
  const container = document.getElementById('wishlistItemsList');
  const btnSend = document.getElementById('sendWishlistWsBtn');
  const favProducts = rawProducts.filter(p => wishlist.includes(p.id));

  if (favProducts.length === 0) {
    container.innerHTML = `<p style="text-align: center; color: #888; padding: 20px 0; font-size: 0.8rem;">No tenés productos guardados en favoritos.</p>`;
    btnSend.disabled = true;
    return;
  }

  btnSend.disabled = false;
  container.innerHTML = favProducts.map(p => `
    <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
      <div style="display: flex; align-items: center; gap: 10px;">
        <img src="${p.image}" style="width: 35px; height: 35px; object-fit: contain; background: #f7f7f7;">
        <div>
          <div style="font-size: 0.75rem; font-weight: 600; max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.name}</div>
          <div style="font-size: 0.7rem; color: #666;">$${p.price.toLocaleString('es-AR')}</div>
        </div>
      </div>
      <button onclick="toggleWishlist('${p.id}')" style="background: none; border: none; cursor: pointer; color: #d90429; font-size: 1.1rem; padding: 4px;">&times;</button>
    </div>
  `).join('');

  const wsNumber = "5493518189444";
  const itemsText = favProducts.map(p => `- ${p.name} ($${p.price.toLocaleString('es-AR')})`).join('\n');
  const wsText = encodeURIComponent(`Hola POMPY! Quisiera consultar por mi lista de favoritos:\n${itemsText}`);
  btnSend.onclick = () => window.open(`https://wa.me/${wsNumber}?text=${wsText}`, '_blank');
}

document.getElementById('openMenuBtn').onclick = () => {
  document.getElementById('sidebarDrawer').classList.add('active');
  document.getElementById('drawerOverlay').classList.add('active');
};

const closeSidebar = () => {
  document.getElementById('sidebarDrawer').classList.remove('active');
  document.getElementById('drawerOverlay').classList.remove('active');
};

document.getElementById('closeMenuBtn').onclick = closeSidebar;
document.getElementById('drawerOverlay').onclick = closeSidebar;

document.getElementById('openSearchBtn').onclick = () => {
  document.getElementById('searchDrawer').classList.toggle('active');
};
document.getElementById('closeSearchBtn').onclick = () => {
  document.getElementById('searchDrawer').classList.remove('active');
};

document.getElementById('searchInput').oninput = applyFilters;
document.getElementById('sortSelect').onchange = applyFilters;

document.getElementById('resetFiltersBtn').onclick = () => {
  document.querySelectorAll('.dyn-filter-check').forEach(cb => cb.checked = false);
  document.getElementById('sortSelect').value = 'default';
  document.getElementById('searchInput').value = '';
  applyFilters();
};

document.getElementById('loadMoreBtn').onclick = () => {
  currentPage++;
  renderProducts();
};

document.getElementById('closeProductModal').onclick = () => {
  document.getElementById('productModal').classList.remove('active');
};
document.getElementById('productModalOverlay').onclick = () => {
  document.getElementById('productModal').classList.remove('active');
};

document.getElementById('openWishlistBtn').onclick = () => {
  renderWishlistModal();
  document.getElementById('wishlistModal').classList.add('active');
};
document.getElementById('closeWishlistModal').onclick = () => {
  document.getElementById('wishlistModal').classList.remove('active');
};
document.getElementById('wishlistModalOverlay').onclick = () => {
  document.getElementById('wishlistModal').classList.remove('active');
};

document.addEventListener('DOMContentLoaded', fetchProducts);