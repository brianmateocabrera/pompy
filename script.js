const SPREADSHEET_ID = '1DQeInDc_uG57XwjM_3SU28My1mlM5Qx6KQ5q3cZKJRk';
const CSV_URL = `https://docs.google.com/spreadsheets/d/e/2PACX-1vSkSU4sulQVpPVoKbFAq2-UKRYzDUSlWU6pNgxRyFV1XTtJJXUlIXogtao6Q9JIFJtG5i9jqheP6Nao/pub?output=csv`;

let rawProducts = [];

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
        id: r[0] || `prod-${index}`,
        category: r[1] || '',
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

    buildFilterOptions();
    renderProducts();
  } catch (err) {
    console.error("Error al cargar la base de datos:", err);
    document.getElementById('productsGrid').innerHTML = `
      <div class="col-12 text-center text-danger py-5">
        <i class="bi bi-exclamation-triangle fs-1"></i>
        <p class="mt-2">Ocurrió un error al cargar el catálogo de productos.</p>
      </div>`;
  }
}

function buildFilterOptions() {
  const categories = [...new Set(rawProducts.map(p => p.subCategory))].sort();
  const brands = [...new Set(rawProducts.map(p => p.brand))].sort();

  const catContainer = document.getElementById('filterCategoryContainer');
  catContainer.innerHTML = categories.map((cat, idx) => `
    <div class="form-check my-2">
      <input class="form-check-input filter-category" type="checkbox" value="${cat}" id="cat-${idx}">
      <label class="form-check-label" for="cat-${idx}">${cat}</label>
    </div>
  `).join('');

  const brandContainer = document.getElementById('filterBrandContainer');
  brandContainer.innerHTML = brands.map((b, idx) => `
    <div class="form-check my-2">
      <input class="form-check-input filter-brand" type="checkbox" value="${b}" id="brand-${idx}">
      <label class="form-check-label" for="brand-${idx}">${b}</label>
    </div>
  `).join('');
}

function renderProducts() {
  const selectedCats = Array.from(document.querySelectorAll('.filter-category:checked')).map(cb => cb.value);
  const selectedBrands = Array.from(document.querySelectorAll('.filter-brand:checked')).map(cb => cb.value);
  const sortOption = document.querySelector('.sort-radio:checked')?.value || 'priceLow';

  let filtered = rawProducts.filter(p => {
    const matchesCat = selectedCats.length === 0 || selectedCats.includes(p.subCategory);
    const matchesBrand = selectedBrands.length === 0 || selectedBrands.includes(p.brand);
    return matchesCat && matchesBrand;
  });

  if (sortOption === 'priceLow') {
    filtered.sort((a, b) => a.price - b.price);
  } else if (sortOption === 'priceHigh') {
    filtered.sort((a, b) => b.price - a.price);
  } else if (sortOption === 'nameAZ') {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  }

  const grid = document.getElementById('productsGrid');
  document.getElementById('productCountBadge').textContent = `${filtered.length} Productos disponibles`;

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="col-12 text-center py-5">
        <p class="text-muted fs-5">No se encontraron productos con los filtros seleccionados.</p>
      </div>`;
    return;
  }

  grid.innerHTML = filtered.map(p => {
    const formattedPrice = `$${p.price.toLocaleString('es-AR')}`;
    const formattedOldPrice = p.oldPrice > 0 ? `$${p.oldPrice.toLocaleString('es-AR')}` : '';

    let badgeHtml = '';
    if (p.badge) {
      badgeHtml = `<span class="badge badge-custom-sale position-absolute top-0 start-0 m-3 px-2.5 py-1.5 rounded-2 shadow-sm">${p.badge}</span>`;
    } else if (p.oldPrice > p.price) {
      badgeHtml = `<span class="badge badge-custom-sale position-absolute top-0 start-0 m-3 px-2.5 py-1.5 rounded-2 shadow-sm">Oferta</span>`;
    }

    const wsNumber = "5493518189444";
    const wsText = encodeURIComponent(`Hola! Quisiera consultar por el producto: ${p.name} (Ref: ${p.id})`);
    const wsUrl = `https://wa.me/${wsNumber}?text=${wsText}`;

    return `
      <div class="col">
        <div class="card h-100 shadow-sm product-card">
          <div class="product-img-wrapper">
            ${badgeHtml}
            <img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.onerror=null; this.src='https://placehold.co/600x600?text=Sin+Imagen';">
          </div>
          <div class="card-body d-flex flex-column p-2 p-sm-3">
            <p class="text-uppercase text-muted small fw-medium mb-1" style="font-size: 0.75rem;">${p.subCategory}</p>
            <h2 class="h6 card-title fw-bold text-dark mb-2 text-truncate">${p.name}</h2>
            <div class="mb-2 mt-auto">
              <span class="${p.oldPrice > 0 ? 'text-danger' : 'text-dark'} fw-bold fs-6">${formattedPrice}</span>
              ${formattedOldPrice ? `<span class="text-muted text-decoration-line-through small ms-1" style="font-size: 0.75rem;">${formattedOldPrice}</span>` : ''}
            </div>
            <a href="${wsUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-whatsapp-custom w-100 d-flex align-items-center justify-content-center text-nowrap small">
              <i class="bi bi-whatsapp fs-5 me-2"></i>Consultar al WhatsApp
            </a>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

document.getElementById('btnApplyFilters').addEventListener('click', renderProducts);
document.addEventListener('DOMContentLoaded', fetchProducts);