function toggleMenu() {
    const menu = document.querySelector(".menu-links");
    const icon = document.querySelector(".hamburger-icon");

    menu.classList.toggle("open");
    icon.classList.toggle("open");


}


// for scroll + highlight on sticky nav bar 

  const navItems = document.querySelectorAll('.sticky-nav li');
  const sections = document.querySelectorAll('section');

  // Smooth scroll on click
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const target = document.querySelector(item.getAttribute('data-target'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // Highlight nav item on scroll
  window.addEventListener('scroll', () => {
    let currentId = '';
    sections.forEach(section => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      if (scrollY >= top - height / 3) {
        currentId = section.getAttribute('id');
      }
    });

    navItems.forEach(item => {
      item.classList.remove('active');
      if (item.getAttribute('data-target') === `#${currentId}`) {
        item.classList.add('active');
      }
    });
  });



// hover z-index
// const stickyNav = document.querySelector('.sticky-nav');
// const items = stickyNav.querySelectorAll('li');

// items.forEach(item => {
//   item.addEventListener('mouseenter', () => {
//     stickyNav.style.zIndex = '10';
//   });
//   item.addEventListener('mouseleave', () => {
//     stickyNav.style.zIndex = '0';
//   });
// });
