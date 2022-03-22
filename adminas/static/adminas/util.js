/*
    General-purpose functions available on all pages.
*/

const QTY_RE = /\d+(?=( x ))/g;
const CLASS_MESSAGE_BOX = 'system-message-box';

const CSS_GENERIC_PANEL = 'panel';
const CSS_GENERIC_PANEL_HEADING = 'panel-header';
const CSS_GENERIC_FORM_LIKE = 'form-like';


// When deleting something, check for 204 before attempting to JSON anything.
async function jsonOr204(response){
    if(response.status === 204) return 204;
    return await response.json();
}

// Avoid JS errors on conditionally displayed elements
function add_event_listener_if_element_exists(element, called_function){
    if(element !== null){
        element.addEventListener('click', called_function);
    }
}

// Add comma for thousands separator
function numberWithCommas(num) {
    // https://stackoverflow.com/questions/2901102/how-to-print-a-number-with-commas-as-thousands-separators-in-javascript
    return num.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
}

// Get the date, localised
function get_date_time(){
    let dt = new Date();
    let display_dt = dt.toLocaleString();
    return display_dt;
}


// Obtain the value of the selected option based on the display text
function index_from_display_text(select_ele, display_text){
    for(let s = 0; s < select_ele.options.length; s++){
        if(select_ele.options[s].text === display_text){
            return s;
        }
    }
    return 0;
}

// Find the last element of a type
function get_last_element(selector){
    let elements = document.querySelectorAll(selector);
    let arr_id = elements.length - 1;
    return elements[arr_id];
}

// Taken from Django documentation for CSRF handling.
function getDjangoCsrfHeaders(){
    // Prepare for CSRF authentication
    var csrftoken = getCookie('csrftoken');
    var headers = new Headers();
    headers.append('X-CSRFToken', csrftoken);
    return headers;
}

// Taken from Django documentation for CSRF handling.
function getCookie(name) {
    // Gets a cookie.
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// Hiding/showing things will be done via a "hide" CSS class. Use these to apply/unapply based on class.
function hide_all_by_class(classname){
    document.querySelectorAll('.' + classname).forEach(ele => {
        ele.classList.add('hide');
    });
}

function unhide_all_by_class(classname){
    document.querySelectorAll('.' + classname).forEach(ele => {
        ele.classList.remove('hide');
    });
}


// Wipe data from a form row
function wipe_data_from_form(form_ele){
    let targets = form_ele.children;
    for(var i=0; i < targets.length; i++){
        if(targets[i].tagName === 'INPUT' && (targets[i].type === 'number' || targets[i].type === 'text')){
            targets[i].value = '';
        }
        if(targets[i].tagName === 'SELECT'){
            targets[i].selectedIndex = 0;
        }
    }
    return false;
}



// -------------------------------------
// CREATE GENERIC DOM ELEMENTS
// -------------------------------------

// Response message (documents)
function display_document_response_message(data, anchor_ele){
    let message_ele = document.querySelector('.' + CLASS_MESSAGE_BOX);

    if(message_ele == null){
        message_ele = create_message_ele();
        anchor_ele.append(message_ele);
    }

    message_ele.innerHTML = `${data['message']} @ ${get_date_time()}`;
}

// Response message (general)
function create_message_ele(){
    let message_ele = document.createElement('div');
    message_ele.classList.add(CLASS_MESSAGE_BOX);
    return message_ele;
}

// Forms or "forms". New JI Form, Edit Filled Slot: create a quantity field
function get_jobitem_qty_field(){
    let fld = document.createElement('input');
    fld.type = 'number';
    fld.name = 'qty';
    fld.id = 'id_qty';
    fld.required = true;
    fld.min = 1;

    return fld;
}

// Create a "panel"
function create_generic_ele_panel(){
    let div = document.createElement('div');
    div.classList.add('panel');
    return div;
}

// Create a "panel" which is pretending to be a form
function create_generic_ele_formy_panel(){
    let div = create_generic_ele_panel();
    div.classList.add('form-like');
    return div;
}

// Create a "cancel" button which doesn't do anything yet, to go in the top right of a panel
function create_generic_ele_cancel_button(){
    let cancel_btn = document.createElement('button');
    cancel_btn.classList.add('close');

    let hover_label_span = document.createElement('span');
    hover_label_span.innerHTML = 'close';
    cancel_btn.append(hover_label_span);

    return cancel_btn;
}

// Create a "submit" button, which doesn't do anything yet
function create_generic_ele_submit_button(){
    let submit_btn = document.createElement('button');

    submit_btn.classList.add('button-primary');
    submit_btn.innerHTML = 'submit';

    return submit_btn;
}

// Create a "delete" button, which doesn't do anything yet
function create_generic_ele_delete_button(){
    let delete_btn = document.createElement('button');
    delete_btn.innerHTML = 'delete';

    delete_btn.classList.add('button-warning');
    delete_btn.classList.add('delete-btn');

    return delete_btn;
}

// Create an "edit" button, which doesn't do anything yet
function create_generic_ele_edit_button(){
    let edit_btn = document.createElement('button');
    edit_btn.classList.add('edit-icon');

    let hover_label_span = document.createElement('span');
    hover_label_span.innerHTML = 'edit';
    edit_btn.append(hover_label_span);

    return edit_btn;
}