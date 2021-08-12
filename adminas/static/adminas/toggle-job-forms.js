document.addEventListener('DOMContentLoaded', function() {
    document.querySelector('#toggle_po_form_btn').addEventListener(
        'click',
        function(e) {
            hide_show_form(e, '#po_form', 'Add PO', 'Hide');
        }
    );
    document.querySelector('#toggle_item_form_btn').addEventListener('click', function(e) {
        hide_show_form(e, '#new_items_container', 'Add Items', 'Hide');
    })
})

function hide_show_form(e, selector, show_text, hide_text){
    HIDE_CLASS = 'hide';

    e.preventDefault();

    btn = e.target;
    target_form = document.querySelector(selector);

    if(e.target.innerHTML === hide_text){
        target_form.classList.add(HIDE_CLASS);
        btn.innerHTML = show_text;
    } else {
        target_form.classList.remove(HIDE_CLASS);
        btn.innerHTML = hide_text;
    }
}