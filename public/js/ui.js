export function mostrarCargando(visible, mensaje = "Procesando...") {
    const el = document.getElementById('loadingText');
    el.textContent = mensaje;
    el.style.display = visible ? 'block' : 'none';
}

export function renderizarTabla(listaProductos, onEditar, onEliminar) {
    const tbody = document.getElementById('tablaProductos');
    if (!listaProductos || listaProductos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">No hay productos registrados.</td></tr>';
        return;
    }

    tbody.innerHTML = listaProductos.map((prod, index) => `
        <tr>
            <td><img src="${prod.imagen}" class="img-preview" alt="${prod.nombre}" onerror="this.src='https://unsplash.com'"></td>
            <td><strong>${prod.nombre}</strong></td>
            <td>$${prod.precio}</td>
            <td>${prod.descripcion || '-'}</td>
            <td>
                <button class="btn-edit" data-index="${index}">Editar</button>
                <button class="btn-delete" data-index="${index}">Eliminar</button>
            </td>
        </tr>
    `).join('');

    // Asignación limpia de eventos para evitar código JavaScript en línea (onclick)
    tbody.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', () => onEditar(parseInt(btn.dataset.index)));
    });
    tbody.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', () => onEliminar(parseInt(btn.dataset.index)));
    });
}

export function cargarFormulario(prod, index) {
    document.getElementById('editIndex').value = index;
    document.getElementById('nombre').value = prod.nombre;
    document.getElementById('precio').value = prod.precio;
    document.getElementById('descripcion').value = prod.descripcion || '';
    document.getElementById('imagenFile').required = false;
    
    document.getElementById('formTitle').textContent = "Editar Producto";
    document.getElementById('btnGuardar').textContent = "Guardar Cambios";
    document.getElementById('btnCancelar').style.display = "inline-block";
}

export function cancelarEdicion() {
    document.getElementById('prodForm').reset();
    document.getElementById('editIndex').value = "-1";
    document.getElementById('formTitle').textContent = "Agregar Nuevo Producto";
    document.getElementById('btnGuardar').textContent = "Guardar Producto";
    document.getElementById('btnCancelar').style.display = "none";
}
