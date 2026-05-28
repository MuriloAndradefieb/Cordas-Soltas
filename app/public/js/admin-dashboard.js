// public/js/admin-dashboard.js
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.btn-action[data-edit-url]').forEach((button) => {
        button.addEventListener('click', () => {
            window.location.href = button.dataset.editUrl;
        });
    });
});
