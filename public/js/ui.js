function escaparHTML(texto) {
    return String(texto ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}


function formatearPrecio(valor) {
    return new Intl.NumberFormat(
        'es-AR',
        {
            style: 'currency',
            currency: 'ARS'
        }
    ).format(Number(valor) || 0);
}


/* ------------------------------------------
   CARGANDO
------------------------------------------ */

export function mostrarCargando(
    visible,
    mensaje = 'Procesando...'
) {
    const el =
        document.getElementById('loadingText');

    if (!el) return;

    el.textContent = mensaje;

    el.style.display =
        visible ? 'block' : 'none';
}


/* ------------------------------------------
   TABLA
------------------------------------------ */

export function renderizarTabla(
    listaProductos,
    onEditar,
    onEliminar
) {
    const tbody =
        document.getElementById(
            'tablaProductos'
        );

    if (!tbody) return;

    if (
        !listaProductos ||
        listaProductos.length === 0
    ) {
        tbody.innerHTML =
            '<tr><td colspan="8">No hay productos registrados.</td></tr>';

        return;
    }

    tbody.innerHTML =
        listaProductos.map(
            (prod, index) => {

                const nombre =
                    escaparHTML(
                        prod.nombre
                    );

                const sku =
                    escaparHTML(
                        prod.sku || '-'
                    );

                const imagen =
                    escaparHTML(
                        prod.imagenPrincipal ||
                        prod.imagenes?.[0]?.url ||
                        prod.imagen ||
                        '/imagenes/no-image.webp'
                    );

                const costo =
                    formatearPrecio(
                        prod.precioCosto
                    );

                const precio =
                    formatearPrecio(
                        prod.precio
                    );

                const stock =
                    Number(prod.stock) || 0;

                let estado =
                    prod.activo
                        ? '<span class="estado-activo">Activo</span>'
                        : '<span class="estado-inactivo">Inactivo</span>';

                if (prod.destacado) {
                    estado +=
                        '<br><span class="estado-destacado">Destacado</span>';
                }

                return `
                    <tr>

                        <td>
                            <img
                                src="${imagen}"
                                class="img-preview"
                                alt="${nombre}"
                                onerror="this.src='/imagenes/no-image.webp'"
                            >
                        </td>

                        <td>
                            <strong>${nombre}</strong>
                        </td>

                        <td>${sku}</td>

                        <td>${costo}</td>

                        <td>${precio}</td>

                        <td>${stock}</td>

                        <td>${estado}</td>

                        <td>

                            <button
                                type="button"
                                class="btn-edit"
                                data-index="${index}"
                            >
                                Editar
                            </button>

                            <button
                                type="button"
                                class="btn-delete"
                                data-index="${index}"
                            >
                                Eliminar
                            </button>

                        </td>

                    </tr>
                `;
            }
        ).join('');


    tbody
        .querySelectorAll('.btn-edit')
        .forEach(btn => {

            btn.addEventListener(
                'click',
                () =>
                    onEditar(
                        parseInt(
                            btn.dataset.index,
                            10
                        )
                    )
            );
        });


    tbody
        .querySelectorAll('.btn-delete')
        .forEach(btn => {

            btn.addEventListener(
                'click',
                () =>
                    onEliminar(
                        parseInt(
                            btn.dataset.index,
                            10
                        )
                    )
            );
        });
}


/* ------------------------------------------
   FORMULARIO
------------------------------------------ */

export function cargarFormulario(
    prod,
    index
) {
    document.getElementById(
        'editIndex'
    ).value = index;


    document.getElementById(
        'sku'
    ).value = prod.sku || '';


    document.getElementById(
        'nombre'
    ).value = prod.nombre || '';


    document.getElementById(
        'precioCosto'
    ).value =
        prod.precioCosto ?? 0;


    document.getElementById(
        'precio'
    ).value =
        prod.precio ?? 0;


    document.getElementById(
        'precioAnterior'
    ).value =
        prod.precioAnterior ?? '';


    document.getElementById(
        'descripcion'
    ).value =
        prod.descripcion || '';


    document.getElementById(
        'categoria'
    ).value =
        Array.isArray(prod.categoria)
            ? prod.categoria.join(', ')
            : '';


    document.getElementById(
        'tags'
    ).value =
        Array.isArray(prod.tags)
            ? prod.tags.join(', ')
            : '';


    document.getElementById(
        'badges'
    ).value =
        Array.isArray(prod.badges)
            ? prod.badges.join(', ')
            : '';


    document.getElementById(
        'stock'
    ).value =
        prod.stock ?? 0;


    document.getElementById(
        'talles'
    ).value =
        Array.isArray(prod.talles)
            ? prod.talles.join(', ')
            : '';


    document.getElementById(
        'colores'
    ).value =
        Array.isArray(prod.colores)
            ? prod.colores.join(', ')
            : '';


    document.getElementById(
        'activo'
    ).checked =
        prod.activo !== false;


    document.getElementById(
        'destacado'
    ).checked =
        prod.destacado === true;


    document.getElementById(
        'orden'
    ).value =
        prod.orden ?? 0;


    document.getElementById(
        'imagenFile'
    ).required = false;


    renderizarImagenesFormulario(prod);


    document.getElementById(
        'formTitle'
    ).textContent =
        'Editar Producto';


    document.getElementById(
        'btnGuardar'
    ).textContent =
        'Guardar Cambios';


    document.getElementById(
        'btnCancelar'
    ).style.display =
        'inline-block';
}


/* ------------------------------------------
   IMÁGENES
------------------------------------------ */

export function renderizarImagenesFormulario(
    producto
) {
    const contenedor =
        document.getElementById(
            'imagenesPreview'
        );

    if (!contenedor) return;


    const imagenes =
        Array.isArray(producto.imagenes)
            ? [...producto.imagenes]
            : producto.imagen
                ? [{
                    url: producto.imagen,
                    alt: producto.nombre,
                    orden: 0
                }]
                : [];


    const principal =
        producto.imagenPrincipal ||
        imagenes[0]?.url ||
        '';


    if (imagenes.length === 0) {
        contenedor.innerHTML =
            '<p>No hay imágenes cargadas.</p>';

        return;
    }


    imagenes.sort(
        (a, b) =>
            (a.orden || 0) -
            (b.orden || 0)
    );


    contenedor.innerHTML =
        imagenes.map(
            (imagen, index) => {

                const url =
                    escaparHTML(
                        imagen.url
                    );

                const alt =
                    escaparHTML(
                        imagen.alt ||
                        producto.nombre
                    );

                const esPrincipal =
                    imagen.url === principal;


                return `
                    <div
                        class="imagen-preview-item"
                        data-imagen-index="${index}"
                    >

                        <img
                            src="${url}"
                            class="${
                                esPrincipal
                                    ? 'imagen-principal'
                                    : ''
                            }"
                            alt="${alt}"
                            onerror="this.src='/imagenes/no-image.webp'"
                        >

                        <p class="imagen-label">
                            ${
                                esPrincipal
                                    ? 'Imagen principal'
                                    : `Imagen ${index + 1}`
                            }
                        </p>

                        <button
                            type="button"
                            class="btn-imagen-principal"
                            data-imagen-index="${index}"
                        >
                            ${
                                esPrincipal
                                    ? 'Principal'
                                    : 'Hacer principal'
                            }
                        </button>

                        <button
                            type="button"
                            class="btn-subir-imagen"
                            data-imagen-index="${index}"
                            ${index === 0 ? 'disabled' : ''}
                        >
                            Subir
                        </button>

                        <button
                            type="button"
                            class="btn-bajar-imagen"
                            data-imagen-index="${index}"
                            ${
                                index === imagenes.length - 1
                                    ? 'disabled'
                                    : ''
                            }
                        >
                            Bajar
                        </button>

                        <button
                            type="button"
                            class="btn-eliminar-imagen"
                            data-imagen-index="${index}"
                        >
                            Eliminar
                        </button>

                    </div>
                `;
            }
        ).join('');
}


/* ------------------------------------------
   CANCELAR
------------------------------------------ */

export function cancelarEdicion() {

    const formulario =
        document.getElementById(
            'prodForm'
        );

    if (formulario) {
        formulario.reset();
    }


    document.getElementById(
        'editIndex'
    ).value = '-1';


    document.getElementById(
        'formTitle'
    ).textContent =
        'Agregar Nuevo Producto';


    document.getElementById(
        'btnGuardar'
    ).textContent =
        'Guardar Producto';


    document.getElementById(
        'btnCancelar'
    ).style.display =
        'none';


    const preview =
        document.getElementById(
            'imagenesPreview'
        );

    if (preview) {
        preview.innerHTML = '';
    }


    document.getElementById(
        'imagenFile'
    ).required = true;
}
