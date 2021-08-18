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
    document.querySelector('#toggle_price_check').addEventListener('click', (e) =>{
        hide_show_all(e, '.price-check-details', 'Check Prices', 'Hide Price Check');
    })
})

function hide_show_all(e, class_selector, show_text, hide_text){
    const HIDE_CLASS = 'hide';
    e.preventDefault();

    let btn = e.target;
    let activating_hide = btn.innerHTML === hide_text;

    let post_toggle_text = 'Price Check';
    if (activating_hide){
        post_toggle_text = show_text;
    } else {
        post_toggle_text = hide_text;
    }

    target_form = document.querySelectorAll(class_selector).forEach(ele =>{
        if (activating_hide){
            ele.classList.add(HIDE_CLASS);
        } else {
            ele.classList.remove(HIDE_CLASS);
        }
        btn.innerHTML = post_toggle_text;
    });  
}

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