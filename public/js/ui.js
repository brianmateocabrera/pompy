function escaparHTML(texto) {
    return String(texto || '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}


export function mostrarCargando(visible, mensaje = "Procesando...") {

    const el =
        document.getElementById('loadingText');

    el.textContent = mensaje;

    el.style.display =
        visible ? 'block' : 'none';
}



export function renderizarTabla(
    listaProductos,
    onEditar,
    onEliminar
) {

    const tbody =
        document.getElementById('tablaProductos');


    if (
        !listaProductos ||
        listaProductos.length === 0
    ) {

        tbody.innerHTML =
            '<tr><td colspan="5">No hay productos registrados.</td></tr>';

        return;

    }



    tbody.innerHTML =
        listaProductos.map((prod, index) => {


            const nombre =
                escaparHTML(prod.nombre);


            const descripcion =
                escaparHTML(
                    prod.descripcion || '-'
                );


            const imagen =
                escaparHTML(
                    prod.imagen ||
                    '/imagenes/no-image.webp'
                );


            const precio =
                new Intl.NumberFormat(
                    'es-AR',
                    {
                        style: 'currency',
                        currency: 'ARS'
                    }
                ).format(prod.precio);



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


                <td>
                    ${precio}
                </td>


                <td>
                    ${descripcion}
                </td>


                <td>

                    <button
                        class="btn-edit"
                        data-index="${index}"
                    >
                        Editar
                    </button>


                    <button
                        class="btn-delete"
                        data-index="${index}"
                    >
                        Eliminar
                    </button>

                </td>

            </tr>

            `;

        }).join('');



    tbody
        .querySelectorAll('.btn-edit')
        .forEach(btn => {

            btn.addEventListener(
                'click',
                () =>
                    onEditar(
                        parseInt(
                            btn.dataset.index
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
                            btn.dataset.index
                        )
                    )
            );

        });

}



export function cargarFormulario(prod, index) {

    document.getElementById('editIndex').value =
        index;


    document.getElementById('nombre').value =
        prod.nombre;


    document.getElementById('precio').value =
        prod.precio;


    document.getElementById('descripcion').value =
        prod.descripcion || '';


    document.getElementById('imagenFile').required =
        false;


    document.getElementById('formTitle').textContent =
        "Editar Producto";


    document.getElementById('btnGuardar').textContent =
        "Guardar Cambios";


    document.getElementById('btnCancelar').style.display =
        "inline-block";

}



export function cancelarEdicion() {

    document.getElementById('prodForm').reset();


    document.getElementById('editIndex').value =
        "-1";


    document.getElementById('formTitle').textContent =
        "Agregar Nuevo Producto";


    document.getElementById('btnGuardar').textContent =
        "Guardar Producto";


    document.getElementById('btnCancelar').style.display =
        "none";

}
