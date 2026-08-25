import {
    autenticarAdministrador,
    cerrarSesion,
    administradorAutenticado
} from './api.js';

import {
    mostrarCargando
} from './ui.js';


// =================================================
// AUTENTICACIÓN
// =================================================

export async function autenticar() {

    const sesionValida =
        await administradorAutenticado();

    if (sesionValida) {
        return true;
    }


    const password =
        prompt(
            'Ingresá la contraseña de administrador:'
        );


    if (password === null) {
        return false;
    }


    if (password === '') {

        alert(
            'Debés ingresar una contraseña.'
        );

        return false;
    }


    mostrarCargando(
        true,
        'Autenticando...'
    );


    try {

        const resultado =
            await autenticarAdministrador(
                password
            );


        if (!resultado.success) {

            alert(
                resultado.error ||
                'Contraseña incorrecta.'
            );

            return false;
        }


        return true;


    } catch (error) {

        alert(
            'Error de autenticación: ' +
            error.message
        );

        return false;


    } finally {

        mostrarCargando(false);
    }
}


// =================================================
// VERIFICAR AUTENTICACIÓN
// =================================================

export async function verificarAutenticacion() {

    const autenticado =
        await administradorAutenticado();

    if (autenticado) {
        return true;
    }

    return await autenticar();
}


// =================================================
// MANEJAR SESIÓN EXPIRADA
// =================================================

export async function manejarErrorSesion(
    error,
    cargarInventario
) {

    const mensaje =
        String(
            error?.message || ''
        ).toLowerCase();


    if (
        mensaje.includes('401') ||
        mensaje.includes('sesión') ||
        mensaje.includes('autentic')
    ) {

        await cerrarSesion();


        const autenticado =
            await autenticar();


        if (autenticado) {

            await cargarInventario();

        } else {

            document.body.innerHTML =
                '<h2>Acceso denegado.</h2>';
        }


        return true;
    }


    return false;
}
