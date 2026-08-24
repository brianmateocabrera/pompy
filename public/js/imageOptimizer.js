const LIMITE_MEGABYTES = 4.5;
const LIMITE_BYTES =
    LIMITE_MEGABYTES * 1024 * 1024;

const MAX_WIDTH = 800;
const CALIDAD_WEBP = 0.7;


export function optimizarImagen(file) {

    return new Promise(
        (resolve, reject) => {

            /* ------------------------------------------
               VALIDACIÓN BÁSICA
            ------------------------------------------ */

            if (!file) {
                reject(
                    new Error(
                        'No se recibió ningún archivo.'
                    )
                );

                return;
            }


            if (
                !file.type ||
                !file.type.startsWith('image/')
            ) {
                reject(
                    new Error(
                        'El archivo seleccionado no es una imagen válida.'
                    )
                );

                return;
            }


            if (file.size <= 0) {
                reject(
                    new Error(
                        'El archivo de imagen está vacío.'
                    )
                );

                return;
            }


            if (file.size > LIMITE_BYTES) {
                reject(
                    new Error(
                        `El archivo original supera el límite permitido de ${LIMITE_MEGABYTES}MB.`
                    )
                );

                return;
            }


            /* ------------------------------------------
               LEER ARCHIVO
            ------------------------------------------ */

            const reader =
                new FileReader();


            reader.onerror = () => {

                reject(
                    new Error(
                        'Error al leer el archivo de imagen.'
                    )
                );
            };


            reader.onload = event => {

                const dataUrl =
                    event.target?.result;


                if (
                    typeof dataUrl !== 'string' ||
                    !dataUrl.startsWith(
                        'data:image/'
                    )
                ) {

                    reject(
                        new Error(
                            'El contenido del archivo no corresponde a una imagen válida.'
                        )
                    );

                    return;
                }


                /* ------------------------------------------
                   PROCESAR IMAGEN
                ------------------------------------------ */

                const img =
                    new Image();


                img.onerror = () => {

                    reject(
                        new Error(
                            'No se pudo procesar la estructura de la imagen.'
                        )
                    );
                };


                img.onload = () => {

                    if (
                        !img.naturalWidth ||
                        !img.naturalHeight
                    ) {

                        reject(
                            new Error(
                                'La imagen no tiene dimensiones válidas.'
                            )
                        );

                        return;
                    }


                    let width =
                        img.naturalWidth;

                    let height =
                        img.naturalHeight;


                    if (
                        width > MAX_WIDTH
                    ) {

                        height =
                            Math.round(
                                (
                                    height *
                                    MAX_WIDTH
                                ) /
                                width
                            );

                        width =
                            MAX_WIDTH;
                    }


                    const canvas =
                        document.createElement(
                            'canvas'
                        );


                    canvas.width =
                        width;

                    canvas.height =
                        height;


                    const ctx =
                        canvas.getContext(
                            '2d'
                        );


                    if (!ctx) {

                        reject(
                            new Error(
                                'No se pudo inicializar el procesador de imágenes.'
                            )
                        );

                        return;
                    }


                    ctx.drawImage(
                        img,
                        0,
                        0,
                        width,
                        height
                    );


                    let dataUrlWebP;


                    try {

                        dataUrlWebP =
                            canvas.toDataURL(
                                'image/webp',
                                CALIDAD_WEBP
                            );

                    } catch (error) {

                        reject(
                            new Error(
                                'No se pudo convertir la imagen a WebP.'
                            )
                        );

                        return;
                    }


                    if (
                        !dataUrlWebP ||
                        !dataUrlWebP.startsWith(
                            'data:image/webp'
                        )
                    ) {

                        reject(
                            new Error(
                                'El navegador no pudo generar una imagen WebP válida.'
                            )
                        );

                        return;
                    }


                    resolve(
                        dataUrlWebP
                    );
                };


                img.src =
                    dataUrl;
            };


            reader.readAsDataURL(file);
        }
    );
}
