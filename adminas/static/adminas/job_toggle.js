/*
    Hide/show stuff on the Job page.
*/
const CLASS_CANCEL_BTN = 'cancel-po-form';


document.addEventListener('DOMContentLoaded', function() {
    document.querySelector('#toggle_po_form_btn').addEventListener('click', () => {
        show_ele(document.getElementById('po_form'));
    });  

    document.querySelectorAll('.' + CLASS_CANCEL_BTN).forEach(btn => {
        btn.addEventListener('click', () => {
            hide_ele(document.getElementById('po_form'));
        })
    });

    document.querySelector('#toggle_item_form_btn').addEventListener('click', function(e) {
        hide_show_form(e, '#new_items_container', 'Add Items', 'Hide');
    });

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

const CLASS_HIDE = 'hide';

function hide_show_form(e, selector, show_text, hide_text){
    

    e.preventDefault();

    btn = e.target;
    target_form = document.querySelector(selector);

    if(e.target.innerHTML === hide_text){
        target_form.classList.add(CLASS_HIDE);
        btn.innerHTML = show_text;
    } else {
        target_form.classList.remove(CLASS_HIDE);
        btn.innerHTML = hide_text;
    }
}

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