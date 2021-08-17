const JOB_ITEM_INPUT_FIELDS = ['quantity', 'product', 'selling_price','price_list'];
const EDIT_ITEM_ID_PREFIX = 'edit_item_';
const EDIT_ITEM_CONTAINER_ID = 'container_edit_item';
const EDIT_ITEM_CLONED_FORMSET_ID = '0-';

document.addEventListener('DOMContentLoaded', function(e) {
    document.querySelectorAll('.ji-edit').forEach(btn => {
        btn.addEventListener('click', function(e){
            edit_mode_job_item(e);
        });
    });
});

function update_job_item(e){
    e.preventDefault();

    // Find the div with the "form" and the div where the results should be displayed
    edit_div = document.querySelector('#' + EDIT_ITEM_CONTAINER_ID);
    result_div = edit_div.previousElementSibling;

    // Variables for fields that are needed in both the PUT and the price check update
    qty = parseInt(edit_div.querySelector(prefix + 'quantity').value.trim());
    product = edit_div.querySelector(prefix + 'product').value.trim();
    price_list = edit_div.querySelector(prefix + 'price_list').value.trim();

    // Prepare for CSRF authentication
    var csrftoken = getCookie('csrftoken');
    var headers = new Headers();
    headers.append('X-CSRFToken', csrftoken);

    // PUT it into the database and call a function to handle the page
    let prefix = '#id_' + EDIT_ITEM_ID_PREFIX;
    fetch(`/items?id=${e.target.dataset.jiid}`, {
        method: 'PUT',
        body: JSON.stringify({
            'quantity': qty,
            'product': product,
            'price_list': price_list,
            'selling_price': edit_div.querySelector(prefix + 'selling_price').value.trim()
        }),
        headers: headers,
        credentials: 'include'
    })
    .then(response => {
        reset_job_item_display(result_div, edit_div);
        update_prices(result_div, qty, product, price_list);
    })
    .catch(error =>{
        console.log('Error: ', error);
    });
}




function reset_job_item_display(result_div, edit_div){
    // Update the display area to contain the values from the form
    for(let i = 0; i < JOB_ITEM_INPUT_FIELDS.length; i++){
        update_item_field_on_page(result_div, edit_div, JOB_ITEM_INPUT_FIELDS[i]);
    }

    // Update the auto-description
    result_div.querySelector('.'+AUTO_DESC_CLASS).innerHTML = edit_div.querySelector('.' + AUTO_DESC_CLASS).innerHTML;

    // Move currency back to its original position, before the selling price field
    result_div.querySelector('.selling_price').before(edit_div.querySelector('.currency'));

    // Remove the entire edit-mode container; unhide the display spans and all the edit buttons
    edit_div.remove();
    result_div.classList.remove('hide');
    document.querySelectorAll('.ji-edit').forEach(btn => {
        btn.classList.remove('hide');
    });
}


function update_item_field_on_page(read_div, edit_div, field_name){
    let result_ele = read_div.querySelector(`.${field_name}`);
    let input_ele = edit_div.querySelector(`#${edit_item_field_id(EDIT_ITEM_ID_PREFIX, field_name)}`);

    if(input_ele.tagName === 'INPUT'){
        if(input_ele.type === 'number' && input_ele.step === '0.01'){
            result_ele.innerHTML = numberWithCommas(parseFloat(input_ele.value.trim()).toFixed(2));

        } else{
            result_ele.innerHTML = input_ele.value.trim();
        }

    } else if(input_ele.tagName === 'SELECT'){
        result_ele.innerHTML = input_ele.options[input_ele.selectedIndex].text.trim();
    }
}



function edit_mode_job_item(e){
    e.preventDefault();

    display_div = e.target.closest('.job-item-container');
    edit_div = edit_mode_div(display_div, e.target);

    // Add the edit-mode container to the DOM and hide the display div
    display_div.after(edit_div);
    display_div.classList.add('hide');

    // Move "currency" text from the hidden read_div to a spot near the selling price input
    document.querySelector('#id_' + EDIT_ITEM_ID_PREFIX + 'selling_price').before(display_div.querySelector('.currency'));

    // Hide all the other edit buttons, so only one item can be added at a time
    document.querySelectorAll('.ji-edit').forEach(btn => {
        btn.classList.add('hide');
    });
}


function edit_mode_div(display_div, edit_btn){
    // The edit item div will contain:
    //      fields listed in 'JOB_ITEM_INPUT_FIELDS', with the input/select elements cloned from the add_item formset *
    //      a label for each field
    //      a submit button
    //
    //      * (This is done to save repeating all the work obtaining/setting validation attributes and options)

    let new_item = document.createElement('div');
    new_item.id = EDIT_ITEM_CONTAINER_ID;

    for(let i=0; i < JOB_ITEM_INPUT_FIELDS.length; i++){
        let label = edit_item_label(JOB_ITEM_INPUT_FIELDS[i]);
        new_item.append(label);

        // Clone the field, adjust the ID/name and populate it with the value from the display div
        var field = edit_item_field(JOB_ITEM_INPUT_FIELDS[i]);
        var preset_value = display_div.querySelector('.' + JOB_ITEM_INPUT_FIELDS[i]).innerHTML;
        if (field.tagName === 'INPUT'){
            field.value = edit_item_preset_input(field, preset_value);

        } else if (field.tagName === 'SELECT'){
            field.selectedIndex = edit_item_preset_select(field, preset_value);
        }         
        new_item.append(field);

        if('product' === JOB_ITEM_INPUT_FIELDS[i]){
            auto_item_desc_listener(new_item);
            new_item.append(get_auto_desc_element());
        }
    }
    
    new_item.append(edit_item_cancel_btn(edit_btn))
    new_item.append(edit_item_submit_btn(edit_btn));
    return new_item;
}

function get_input_field_from_job_item_form(field_name){
    return document.querySelector(`#id_form-${EDIT_ITEM_CLONED_FORMSET_ID}${field_name}`);
}

function edit_item_field(my_field){
    // The cloned row is from a formset, so remove the unnecessary '-0' from the ID and name
    var original = get_input_field_from_job_item_form(my_field);
    var field = original.cloneNode(true);
    field.id = edit_item_field_id(EDIT_ITEM_ID_PREFIX, my_field);
    field.name = remove_formset_id(field.name); 
    return field;   
}

function edit_item_label(field_name){
    var original = get_input_field_from_job_item_form(field_name);
    var label = original.previousElementSibling.cloneNode(true);
    label.htmlFor = remove_formset_id(label.htmlFor);
    return label;
}

function edit_item_submit_btn(edit_btn){
    let submit_btn = document.createElement('button');
    submit_btn.innerHTML = 'submit';
    submit_btn.id = 'id_btn_edit_item';
    submit_btn.dataset.jiid =edit_btn.dataset.jiid;
    submit_btn.addEventListener('click', (e) => {
        update_job_item(e);
    });
    return submit_btn;
}

function edit_item_cancel_btn(edit_btn){
    let cancel_btn = document.createElement('button');
    cancel_btn.innerHTML = 'cancel';
    cancel_btn.id = 'id_btn_cancel_edit_item';
    cancel_btn.dataset.jiid = cancel_btn.dataset.jiid;
    cancel_btn.addEventListener('click', (e) =>{
        cancel_item_edit(e);
    });
    return cancel_btn;
}

function cancel_item_edit(e){
    let edit_div = document.querySelector('#' + EDIT_ITEM_CONTAINER_ID);
    let result_div = edit_div.previousElementSibling;        
    reset_job_item_display(result_div, edit_div);
}


function edit_item_preset_input(field, value){
    if(field.type === 'number' && field.step === '0.01'){
        return parseFloat(value.replaceAll(',', '')).toFixed(2);

    } else if (field.type === 'number'){
        return parseInt(value.replaceAll(',', ''));   
    }
    return value;
}



function edit_item_preset_select(field, span_value){
    for(let s = 0; s < field.options.length; s++){
        if(field.options[s].text === span_value){
            return s;
        }
    }
    return 0;
}


function edit_item_field_id(prefix, name){
    return 'id_' + prefix + name;
}


function remove_formset_id(str){
    return str.replace(EDIT_ITEM_CLONED_FORMSET_ID, '');
}


function update_prices(result_div, qty, product_id, price_list_id){

    fetch(`/prices?product_id=${product_id}&price_list_id=${price_list_id}`)
    .then(response => response.json())
    .then(item_info => {
        display_auto_prices(item_info, result_div, qty);
    })
    .catch(error =>{
        console.log('Error: ', error);
    });
}

function display_auto_prices(price_info, result_div, qty){
    
}





// GENERAL USE ----------------------------------------------------------------
function getCookie(name) {
    // Gets a cookie.
    // Taken from Django documentation for CSRF handling
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