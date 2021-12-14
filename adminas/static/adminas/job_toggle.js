/*
    Job page has two forms added via the Django templates and set with the "hide" class on-load.
    here:
        > Associated "add" buttons gain the ability to unhide the forms
        > Associated "close" buttons gain the ability to re-hide the forms
*/
const CLASS_HIDE = 'hide';

document.addEventListener('DOMContentLoaded', function() {
    document.querySelector('#toggle_po_form_btn').addEventListener('click', () => {
        show_ele(document.getElementById('po_form'));
    });  

    document.querySelectorAll('.' + 'cancel-po-form').forEach(btn => {
        btn.addEventListener('click', () => {
            hide_ele(document.getElementById('po_form'));
        })
    });


    document.getElementById('open_item_form_btn').addEventListener('click', () => {
        show_ele(document.getElementById('new_items_container'));
        hide_ele(document.getElementById('open_item_form_btn'));
    });

    document.querySelector('#close_item_form_btn').addEventListener('click', () => {
        hide_ele(document.getElementById('new_items_container'));
        show_ele(document.getElementById('open_item_form_btn'));
    });

})

function show_ele(ele){
    if(ele.classList.contains(CLASS_HIDE)){
        ele.classList.remove(CLASS_HIDE);
    }
}

function hide_ele(ele){
    if(!ele.classList.contains(CLASS_HIDE)){
        ele.classList.add(CLASS_HIDE);
    }
}