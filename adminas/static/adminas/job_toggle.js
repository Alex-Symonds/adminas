/*
    Job page has two forms and a popout added via the Django templates and set with the "hide" class on-load.
    Here:
        > Associated "add" buttons gain the ability to unhide the forms/popout
        > Associated "close" buttons gain the ability to re-hide the forms/popout
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

    let admin_notifications_btn = document.querySelector('.admin-info-btn');
    if(admin_notifications_btn != null){
        admin_notifications_btn.addEventListener('click', () => {
            show_ele(document.getElementById('admin_info_container'));
        });  
    }

    let admin_notifications_close = document.getElementById('admin_info_container').querySelector('.' + 'close');
    if(admin_notifications_close != null){
        admin_notifications_close.addEventListener('click', () => {
            hide_ele(document.getElementById('admin_info_container'));
        });
    }

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