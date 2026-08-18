    document.querySelectorAll('.category-item, .product-card, .nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if(item.classList.contains('nav-item')) {
          document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
          item.classList.add('active');
        }
      });
    });