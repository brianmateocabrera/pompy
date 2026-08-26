const botones =
    document.querySelectorAll(
        '.admin-nav-item'
    );

const vistas =
    document.querySelectorAll(
        '.vista-admin'
    );


botones.forEach(
    boton => {

        boton.addEventListener(
            'click',
            () => {

                const id =
                    boton.dataset.vista;


                vistas.forEach(
                    vista => {

                        vista.classList.toggle(
                            'activa',
                            vista.id === id
                        );
                    }
                );


                botones.forEach(
                    item => {

                        item.classList.toggle(
                            'activo',
                            item === boton
                        );
                    }
                );


                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            }
        );
    }
);