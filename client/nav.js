function showSidebar() {
    const sidebar= document.querySelector('.side-bar')
    sidebar.style.display = 'flex'
}

function closeSidebar() {
    const closeSidebar = document.querySelector('.side-bar')
    closeSidebar.style.display = 'none'
}

function hideFilterbar() {
    const hideFilterbar = document.querySelector('.filterSidebar')
    hideFilterbar.style.display = 'none'
}
function toggleFilterbar() {
    const filterSidebar = document.querySelector('.filterSidebar');
    if (filterSidebar.style.display === 'flex') {
        filterSidebar.style.display = 'none'
    }

    else {
        filterSidebar.style.display = 'flex'
    }
}