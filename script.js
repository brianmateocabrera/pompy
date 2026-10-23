const CSV_URL = `https://docs.google.com/spreadsheets/d/e/2PACX-1vSkSU4sulQVpPVoKbFAq2-UKRYzDUSlWU6pNgxRyFV1XTtJJXUlIXogtao6Q9JIFJtG5i9jqheP6Nao/pub?output=csv`;
const PAGE_SIZE = 12;

let rawProducts = [];
let filteredProducts = [];
let currentPage = 1;
let wishlist = JSON.parse(localStorage.getItem('pompy_wishlist') || '[]');
let dynamicFilterKeys = [];

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
        category: r[1] || 'General',
        subCategory: r[2] || 'Otros',
        brand: r[3] || 'Sin Marca',
        model: r[4] || '',
        name: r[5] || 'Producto sin nombre',
        price: price,
        oldPrice: oldPrice,
        image: imgSrc,
        badge: r[13] || '',
        visible: (r[14] || 'TRUE').toUpperCase() === 'TRUE'
      };
    }).filter(p => p.visible && p.name && p.price > 0);

    buildDynamicFilterOptions();
    applyFilters();
    updateWishlistBadge();
  } catch (err) {
    console.error("Error al cargar la base de datos:", err);
    document.getElementById('productsGrid').innerHTML = `
      <div class="col-12 text-center text-danger py-5">
        <i class="bi bi-exclamation-triangle fs-1"></i>
        <p class="mt-2">Ocurrió un error al cargar el catálogo de productos.</p>
      </div>`;
  }
}

function buildDynamicFilterOptions() {
  const filterConfigs = [
    { key: 'category', title: 'Categoría' },
    { key: 'subCategory', title: 'Sub-Categoría' },
    { key: 'brand', title: 'Marca' }
  ];

  dynamicFilterKeys = filterConfigs.map(c => c.key);
  const container = document.getElementById('dynamicFiltersContainer');
  container.innerHTML = '';

  filterConfigs.forEach((config, idx) => {
    const values = [...new Set(rawProducts.map(p => p[config.key]))].filter(Boolean).sort();
    if (values.length === 0) return;

    const accordionId = `collapseDynFilter-${idx}`;

    const itemHtml = `
      <div class="accordion-item mb-2 border rounded">
        <h3 class="accordion-header" id="headingDynFilter-${idx}">
          <button class="accordion-button collapsed fw-semibold text-uppercase" type="button" data-bs-toggle="collapse" data-bs-target="#${accordionId}" aria-expanded="false" aria-controls="${accordionId}">
            ${config.title}
          </button>
        </h3>
        <div id="${accordionId}" class="accordion-collapse collapse" aria-labelledby="headingDynFilter-${idx}" data-bs-parent="#dynamicFiltersContainer">
          <div class="accordion-body small py-2 px-3">
            ${values.map((val, valIdx) => `
              <div class="form-check my-2">
                <input class="form-check-input filter-dynamic-check" type="checkbox" data-filter-key="${config.key}" value="${val}" id="dyn-${idx}-${valIdx}">
                <label class="form-check-label" for="dyn-${idx}-${valIdx}">${val}</label>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    container.insertAdjacentHTML('beforeend', itemHtml);
  });
}

function applyFilters() {
  const activeFilters = {};
  dynamicFilterKeys.forEach(key => {
    activeFilters[key] = Array.from(document.querySelectorAll(`.filter-dynamic-check[data-filter-key="${key}"]:checked`)).map(cb => cb.value);
  });

  const sortOption = document.querySelector('.sort-radio:checked')?.value || 'default';
  const searchQuery = document.getElementById('searchInput').value.toLowerCase().trim();

  filteredProducts = rawProducts.filter(p => {
    const matchesFilters = dynamicFilterKeys.every(key => {
      const selected = activeFilters[key];
      return selected.length === 0 || selected.includes(p[key]);
    });

    const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery) || p.subCategory.toLowerCase().includes(searchQuery) || p.brand.toLowerCase().includes(searchQuery);

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
  document.getElementById('productCountBadge').textContent = `${filteredProducts.length} Productos`;

  if (filteredProducts.length === 0) {
    grid.innerHTML = `
      <div class="col-12 text-center py-5">
        <p class="text-muted fs-5">No se encontraron productos con los filtros seleccionados.</p>
      </div>`;
    document.getElementById('loadMoreContainer').classList.add('d-none');
    return;
  }

  const paginated = filteredProducts.slice(0, currentPage * PAGE_SIZE);

  grid.innerHTML = paginated.map(p => {
    const formattedPrice = `$${p.price.toLocaleString('es-AR')}`;
    const formattedOldPrice = p.oldPrice > 0 ? `$${p.oldPrice.toLocaleString('es-AR')}` : '';
    const isFav = wishlist.includes(p.id);

    let badgeHtml = '';
    if (p.badge) {
      badgeHtml = `<span class="badge badge-custom-sale position-absolute top-0 start-0 m-3 px-2 py-1 rounded-2 shadow-sm">${p.badge}</span>`;
    } else if (p.oldPrice > p.price) {
      badgeHtml = `<span class="badge badge-custom-sale position-absolute top-0 start-0 m-3 px-2 py-1 rounded-2 shadow-sm">Oferta</span>`;
    }

    const wsNumber = "5493518189444";
    const productUrl = `${window.location.origin}${window.location.pathname}?id=${p.id}`;
    const wsText = encodeURIComponent(`Hola! Quisiera consultar por el producto: ${p.name} (Ref: ${p.id})\nEnlace: ${productUrl}`);
    const wsUrl = `https://wa.me/${wsNumber}?text=${wsText}`;

    return `
      <div class="col">
        <div class="card shadow-sm product-card">
          <div class="product-img-wrapper" onclick="openDetailModal('${p.id}')">
            ${badgeHtml}
            <button class="btn-wishlist ${isFav ? 'active' : ''}" onclick="event.stopPropagation(); toggleWishlist('${p.id}')" aria-label="Guardar en favoritos">
              <i class="bi bi-heart${isFav ? '-fill' : ''}"></i>
            </button>
            <img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.onerror=null; this.src='https://placehold.co/600x600?text=Sin+Imagen';">
          </div>
          <div class="card-body d-flex flex-column p-2 p-sm-3">
            <p class="text-uppercase text-muted small fw-medium mb-1" style="font-size: 0.75rem;">${p.subCategory}</p>
            <h2 class="h6 card-title fw-bold text-dark mb-2 text-truncate" style="cursor:pointer;" onclick="openDetailModal('${p.id}')">${p.name}</h2>
            <div class="mb-2 mt-auto">
              <span class="${p.oldPrice > 0 ? 'text-danger' : 'text-dark'} fw-bold fs-6">${formattedPrice}</span>
              ${formattedOldPrice ? `<span class="text-muted text-decoration-line-through small ms-1" style="font-size: 0.75rem;">${formattedOldPrice}</span>` : ''}
            </div>
            <a href="${wsUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-whatsapp-custom w-100 d-flex align-items-center justify-content-center text-nowrap small">
              <i class="bi bi-whatsapp fs-5 me-2"></i>Consultar
            </a>
          </div>
        </div>
      </div>
    `;
  }).join('');

  const loadMoreBtn = document.getElementById('loadMoreContainer');
  if (paginated.length < filteredProducts.length) {
    loadMoreBtn.classList.remove('d-none');
  } else {
    loadMoreBtn.classList.add('d-none');
  }
}

function openDetailModal(id) {
  const p = rawProducts.find(item => item.id === id);
  if (!p) return;

  const formattedPrice = `$${p.price.toLocaleString('es-AR')}`;
  const formattedOldPrice = p.oldPrice > 0 ? `$${p.oldPrice.toLocaleString('es-AR')}` : '';
  const wsNumber = "5493518189444";
  const productUrl = `${window.location.origin}${window.location.pathname}?id=${p.id}`;
  const wsText = encodeURIComponent(`Hola! Quisiera consultar por el producto: ${p.name} (Ref: ${p.id})\nEnlace: ${productUrl}`);
  const wsUrl = `https://wa.me/${wsNumber}?text=${wsText}`;

  document.getElementById('productDetailContent').innerHTML = `
    <div class="text-center mb-3">
      <img src="${p.image}" alt="${p.name}" class="img-fluid rounded" style="max-height: 300px; object-fit: contain;" onerror="this.onerror=null; this.src='https://placehold.co/600x600?text=Sin+Imagen';">
    </div>
    <span class="badge bg-secondary mb-2">${p.subCategory}</span>
    <h4 class="fw-bold text-dark mb-2">${p.name}</h4>
    <p class="text-muted small mb-1">Marca: ${p.brand} | Ref: ${p.id}</p>
    <div class="mb-3">
      <span class="${p.oldPrice > 0 ? 'text-danger' : 'text-dark'} fw-bold fs-4">${formattedPrice}</span>
      ${formattedOldPrice ? `<span class="text-muted text-decoration-line-through small ms-2">${formattedOldPrice}</span>` : ''}
    </div>
    <a href="${wsUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-whatsapp-custom w-100 d-flex align-items-center justify-content-center">
      <i class="bi bi-whatsapp fs-5 me-2"></i>Consultar por WhatsApp
    </a>
  `;

  const modal = new bootstrap.Modal(document.getElementById('productDetailModal'));
  modal.show();
}

function toggleWishlist(id) {
  if (wishlist.includes(id)) {
    wishlist = wishlist.filter(itemId => itemId !== id);
  } else {
    wishlist.push(id);
  }
  localStorage.setItem('pompy_wishlist', JSON.stringify(wishlist));
  updateWishlistBadge();
  renderProducts();
}

function updateWishlistBadge() {
  document.getElementById('wishlistBadge').textContent = wishlist.length;
}

function renderWishlistModal() {
  const container = document.getElementById('wishlistModalBody');
  const btnSend = document.getElementById('btnSendWishlistWs');

  const favProducts = rawProducts.filter(p => wishlist.includes(p.id));

  if (favProducts.length === 0) {
    container.innerHTML = `<p class="text-center text-muted py-4">No tenés productos guardados en tus favoritos.</p>`;
    btnSend.disabled = true;
    return;
  }

  btnSend.disabled = false;
  container.innerHTML = favProducts.map(p => `
    <div class="d-flex align-items-center justify-content-between border-bottom py-2">
      <div class="d-flex align-items-center gap-2">
        <img src="${p.image}" alt="${p.name}" style="width: 45px; height: 45px; object-fit: cover;" class="rounded">
        <div>
          <h6 class="mb-0 text-truncate" style="max-width: 180px;">${p.name}</h6>
          <small class="text-muted">$${p.price.toLocaleString('es-AR')}</small>
        </div>
      </div>
      <button class="btn btn-sm btn-outline-danger border-0" onclick="toggleWishlist('${p.id}'); renderWishlistModal();"><i class="bi bi-trash"></i></button>
    </div>
  `).join('');

  const wsNumber = "5493518189444";
  const itemsText = favProducts.map(p => `- ${p.name} ($${p.price.toLocaleString('es-AR')})`).join('\n');
  const wsText = encodeURIComponent(`Hola! Quisiera consultar por la siguiente lista de favoritos:\n${itemsText}`);
  btnSend.onclick = () => window.open(`https://wa.me/${wsNumber}?text=${wsText}`, '_blank');
}

document.getElementById('btnApplyFilters').addEventListener('click', applyFilters);
document.getElementById('btnResetFilters').addEventListener('click', () => {
  document.querySelectorAll('.filter-dynamic-check').forEach(cb => cb.checked = false);
  document.getElementById('sortDefault').checked = true;
  document.getElementById('searchInput').value = '';
  applyFilters();
});

document.getElementById('searchInput').addEventListener('input', applyFilters);
document.getElementById('btnLoadMore').addEventListener('click', () => {
  currentPage++;
  renderProducts();
});

document.getElementById('wishlistModal').addEventListener('show.bs.modal', renderWishlistModal);
document.addEventListener('DOMContentLoaded', fetchProducts);