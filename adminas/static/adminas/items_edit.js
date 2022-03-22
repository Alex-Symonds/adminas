/*
    Edit JobItem functions for the Job page.
    
    Covers:
        > Entering "edit mode", i.e. creating a form populated with the current info in a "read-only" row
        > Sending the edit form to the server
        > Updating the DOM and returning it to "read-mode" (including price checks elsewhere on the Job page)
        > Cancel button to return to read-mode without contacting the server
        > Delete button to remove a JobItem entirely
*/

// Constants
const JOB_ITEM_INPUT_FIELDS = ['quantity', 'product', 'selling_price', 'price_list'];
const EDIT_ITEM_ID_PREFIX = 'edit_item_';
const EDIT_ITEM_CONTAINER_ID = 'container_edit_item';
const EDIT_ITEM_CLONED_FORMSET_ID = '0-';
const STD_ACC_CLASS = 'std-accs';
const STD_ACC_CONTAINER_CLASS = 'std-accs-container';
const ID_PREFIX_PRICE_CHECK_ROW = 'price_check_row_';
const CLASS_PRICE_CHECKER_EDIT_WINDOW = 'price-checker-edit-window';
const CLASS_JOBITEM_DIV = 'job-item-container';
const CLASS_PO_CHECK_DIV = 'po-discrepancy';
const CLASS_MONEY_ELE = 'money';

const CSS_CLASS_WARNING_MESSAGE = 'temp-warning-msg';
const CLASS_JOBITEM_EDIT_BTN = 'ji-edit';

// DOMContentLoaded eventListener additions
document.addEventListener('DOMContentLoaded', function(e) {

    document.querySelectorAll('.ji-delete').forEach(btn => {
        btn.addEventListener('click', function(e){
            delete_job_item(e);
        });
    });

    document.querySelectorAll('.' + CLASS_JOBITEM_EDIT_BTN).forEach(btn => {
        btn.addEventListener('click', function(e){
            edit_mode_job_item(e);
        });
    });

    let price_check_table = document.querySelector('#price_check_table');
    if (price_check_table != null){
        document.querySelector('#price_check_table').querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', function(e){
                edit_mode_price_check(e);
            })
        });
    }

});









/* -----------------------------------------------------------------------------------------------------------
    DELETE
-------------------------------------------------------------------------------------------------------------- */
// Delete a job item from the server, then call functions to update DOM
function delete_job_item(e){
    fetch(`${URL_ITEMS}?id=${e.target.dataset.jiid}`, {
        method: 'DELETE',
        headers: getDjangoCsrfHeaders(),
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        // If there's a message, display it.
        if('message' in data){
            let jobitem_ele = document.getElementById(`jobitem_${e.target.dataset.jiid}`);
            display_error_message_in_job_item(jobitem_ele, data['message']);
            read_mode_job_item(jobitem_ele, document.querySelector(`#${EDIT_ITEM_CONTAINER_ID}`));
        }
        // Reload the page to update module assignments on all the remaining JobItems
        else if('reload' in data){
            location.reload();
        }
    })
}

















/* -----------------------------------------------------------------------------------------------------------
    EDIT MODE: PHASE I, DISPLAY A FORM
-------------------------------------------------------------------------------------------------------------- */
// Edit JobItem (before): onclick of the edit button, enter "edit mode"
function edit_mode_job_item(e){
    e.preventDefault();

    let display_div = e.target.closest('.' + CLASS_JOBITEM_DIV);
    let edit_form = create_ele_jobitem_editor(display_div, e.target);

    // Add the edit-mode container to the DOM and hide the display div
    display_div.after(edit_form);
    display_div.classList.add('hide');

    // Move "currency" text from the hidden read_div to a spot near the selling price input in the "form-like"
    document.querySelector('#id_' + EDIT_ITEM_ID_PREFIX + 'selling_price').before(display_div.querySelector('.currency'));

    // Hide all the edit buttons, so only one item can be added at a time
    hide_all_by_class()
    document.querySelectorAll('.' + CLASS_JOBITEM_EDIT_BTN).forEach(btn => {
        btn.classList.add('hide');
    });
}

// Edit JobItem (before): Create a form element for editing an existing JobItem
function create_ele_jobitem_editor(display_div, edit_btn){
    // Here's the "form-like"
    let edit_mode_ele = document.createElement('div');
    edit_mode_ele.id = EDIT_ITEM_CONTAINER_ID;
    edit_mode_ele.classList.add(CSS_GENERIC_PANEL);
    edit_mode_ele.classList.add(CSS_GENERIC_FORM_LIKE);

    edit_mode_ele.append(create_ele_edit_item_cancel_btn());
    edit_mode_ele.append(create_ele_jobitem_editor_heading());

    // Here's the inputs
    for(let i=0; i < JOB_ITEM_INPUT_FIELDS.length; i++){
        // Add a label to the new_item div
        let label = edit_item_label(JOB_ITEM_INPUT_FIELDS[i]);
        edit_mode_ele.append(label);

        // Clone the field, adjust the ID/name and populate it with the value from the display div
        var field = edit_item_field_ele(JOB_ITEM_INPUT_FIELDS[i]);
        var preset_value = display_div.querySelector('.' + JOB_ITEM_INPUT_FIELDS[i]).innerHTML;
        if (field.tagName === 'INPUT'){
            field.value = edit_item_preset_input(field, preset_value);

        } else if (field.tagName === 'SELECT'){
            field.selectedIndex = index_from_display_text(field, preset_value);
        }         
        edit_mode_ele.append(field);

        // Product dropdown is special: it should have an auto-updating full description underneath
        if('product' === JOB_ITEM_INPUT_FIELDS[i]){
            auto_item_desc_listener(field);
            edit_mode_ele.append(get_auto_desc_element());
        }
    }
    
    // Open the doors and here's all the... people? P-inputs?
    // Buttons. Here are the buttons.
    edit_mode_ele.append(create_ele_jobitem_editor_button_container(edit_btn));
    return edit_mode_ele;
}

// Edit JobItem: display ele component. Button container.
function create_ele_jobitem_editor_button_container(edit_btn){
    let container_ele = document.createElement('div');
    container_ele.classList.add('controls');
    container_ele.append(edit_item_submit_btn(edit_btn));
    container_ele.append(edit_item_delete_btn(edit_btn));
    return container_ele;
}

// Edit JobItem: display ele component. Heading.
function create_ele_jobitem_editor_heading(){
    let heading = document.createElement('h5');
    heading.classList.add(CSS_GENERIC_PANEL_HEADING);
    heading.innerHTML = 'Edit Item';
    return heading;
}


// Edit JobItem (before): Create a label element for the edit form
function edit_item_label(field_name){
    var original = get_form_element_from_job_item_formset(field_name);
    var label = original.previousElementSibling.cloneNode(true);
    label.htmlFor = remove_formset_id(label.htmlFor);
    return label;
}

// Edit JobItem (before): Create an input/select element for the edit form via cloning the field added by Django
function edit_item_field_ele(my_field){
    var original = get_form_element_from_job_item_formset(my_field);
    var field = original.cloneNode(true);
    field.id = edit_item_field_id(EDIT_ITEM_ID_PREFIX, my_field);
    field.name = remove_formset_id(field.name); 
    return field;   
}

// Edit JobItem (before): Retrieve the appropriately formatted preset input for the different types of edit item fields
function edit_item_preset_input(field, value){
    if(field.type === 'number' && field.step === '0.01'){
        return parseFloat(value.replaceAll(',', '')).toFixed(2);

    } else if (field.type === 'number'){
        return parseInt(value.replaceAll(',', ''));   
    }
    return value;
}

// Edit JobItem (before): Create a cancel button element for the edit form
function create_ele_edit_item_cancel_btn(){
    let cancel_btn = create_generic_ele_cancel_button();

    cancel_btn.id = 'id_btn_cancel_edit_item';
    cancel_btn.dataset.jiid = cancel_btn.dataset.jiid;
    cancel_btn.addEventListener('click', () =>{
        cancel_item_edit();
    });

    return cancel_btn;
}

// Edit JobItem (before): Revert to read-mode without updating the server
function cancel_item_edit(){
    let edit_div = document.querySelector('#' + EDIT_ITEM_CONTAINER_ID);
    let result_div = edit_div.previousElementSibling;      
    read_mode_job_item(result_div, edit_div);
}

// Edit JobItem (before): Create a submit button element for the edit form
function edit_item_submit_btn(edit_btn){
    let submit_btn = create_generic_ele_submit_button();

    submit_btn.id = 'id_btn_edit_item';
    submit_btn.dataset.jiid = edit_btn.dataset.jiid;
    submit_btn.addEventListener('click', (e) => {
        update_job_item(e);
    });

    return submit_btn;
}

function edit_item_delete_btn(edit_btn){
    let delete_btn = create_generic_ele_delete_button();

    delete_btn.setAttribute('data-jiid', edit_btn.dataset.jiid);
    delete_btn.addEventListener('click', (e) => {
        delete_job_item(e);
    });

    return delete_btn;
}



// Supporting one-liner functions
function get_form_element_from_job_item_formset(field_name){
    return document.querySelector(`#id_form-${EDIT_ITEM_CLONED_FORMSET_ID}${field_name}`);
}

function edit_item_field_id(prefix, name){
    return 'id_' + prefix + name;
}

function remove_formset_id(str){
    // Note: this is intended to remove the "-0" formset numbering from names/IDs/whatever
    return str.replace(EDIT_ITEM_CLONED_FORMSET_ID, '');
}














/* -----------------------------------------------------------------------------------------------------------
    EDIT MODE: PHASE II, USER CLICKED SUBMIT
-------------------------------------------------------------------------------------------------------------- */
// Edit JobItem (action): Update the JobItem on the server, then call functions to update the DOM
function update_job_item(e){
    // This is called by the submit button on the JS-created edit form
    e.preventDefault();

    // Find the div with the "form" and the div where the results should be displayed
    let edit_ele = document.querySelector('#' + EDIT_ITEM_CONTAINER_ID);

    let prefix = '#id_' + EDIT_ITEM_ID_PREFIX;
    let prl_sel = edit_ele.querySelector(prefix + 'price_list')

    // PUT it into the database and call functions to handle the DOM
    fetch(`${URL_ITEMS}?id=${e.target.dataset.jiid}`, {
        method: 'PUT',
        body: JSON.stringify({
            'quantity': parseInt(edit_ele.querySelector(prefix + 'quantity').value.trim()),
            'product': edit_ele.querySelector(prefix + 'product').value.trim(),
            'price_list': prl_sel.value.trim(),
            'selling_price': edit_ele.querySelector(prefix + 'selling_price').value.trim()
        }),
        headers: getDjangoCsrfHeaders(),
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        let result_ele = edit_ele.previousElementSibling;
        // If the edit caused big enough changes to require a reload, reload the page
        if (data['reload'] === 'true'){
            location.reload();
        }
        else{
            if('message' in data){
                display_error_message_in_job_item(result_ele, data['message']);
            }
            read_mode_job_item(result_ele, edit_ele);
        }
    })
    .catch(error =>{
        console.log('Error: ', error);
    });
}


// Edit JobItem (response): create an ele to display an error message and position it inside a JobItem panel.
function display_error_message_in_job_item(result_ele, message_str){

    // Clear any previous errors. One error at a time.
    existing_warning = document.querySelector(`.${CSS_CLASS_WARNING_MESSAGE}`);
    if(existing_warning != null){
        existing_warning.remove();
    }

    // Create the ele
    error_message_ele = create_ele_error_message(message_str);

    // Position it
    preceding_ele = result_ele.querySelector('.' + CLASS_MONEY_ELE);
    if(preceding_ele != null){
        preceding_ele.after(error_message_ele)
    }
    else{
        result_ele.append(error_message_ele)
    }
    
    return;
}

// Edit JobItem (response): display ele. Error message for going inside JobItem panels
function create_ele_error_message(message_str){
    let ele = document.createElement('div');
    ele.classList.add(CSS_CLASS_WARNING_MESSAGE);
    ele.innerHTML = message_str;
    return ele;
}


// Edit JobItem (response): Remove the edit form. Called by cancel button and during the post-edit process
function read_mode_job_item(result_div, edit_form){
    // Move currency back to its original position (i.e. before the read-only selling price)
    result_div.querySelector('.selling_price').before(edit_form.querySelector('.currency'));

    // Unhide stuff that's hidden during edit-mode
    result_div.classList.remove('hide');
    unhide_all_by_class(CLASS_JOBITEM_EDIT_BTN);

    // Remove the edit form
    // NOTE: Refactoring code? Make sure the line moving the currency element comes before this.
    edit_form.remove();
}


// Edit JobItem (response), Delete: Get a row in the table for a particular item
function find_price_check_tr(jobitem_id){
    // Note: used for editing AND deleting, so don't get ideas about removing this one liner and incorporating it into the edit function
    return document.querySelector('#' + ID_PREFIX_PRICE_CHECK_ROW + jobitem_id);
}







// -------------------------------------------------------------------
// Edit price from price check table
// -------------------------------------------------------------------
// Price check edit (before): onclick of the edit button in the selling price column
function edit_mode_price_check(e){
    let table_row = find_price_check_tr(e.target.dataset.jiid);
    let price_check_edit_window = create_ele_jobitem_editor_price_only(table_row);
    e.target.after(price_check_edit_window);
    hide_all_by_class('edit-btn');
}

// Price check edit (before): creates a panel for editing a price
function create_ele_jobitem_editor_price_only(table_row_ele){
    let div = document.createElement('div');
    div.classList.add(CLASS_PRICE_CHECKER_EDIT_WINDOW);
    div.classList.add(CSS_GENERIC_PANEL);
    div.classList.add(CSS_GENERIC_FORM_LIKE);
    div.classList.add('popout');

    div.append(get_price_edit_close_btn());

    let h = document.createElement('h5');
    h.classList.add(CSS_GENERIC_PANEL_HEADING);
    h.innerHTML = 'Edit Price';
    div.append(h);

    let item_p = get_item_desc_from_price_checker(table_row_ele);
    div.append(item_p);

    div.append(create_ele_jobitem_editor_price_only_preset_prices(table_row_ele));

    let enter_div = create_ele_jobitem_editor_price_only_manual_price();
    div.append(enter_div);

    return div;
}

// Price check edit (before): display ele component. A container with the pre-set prices inside.
function create_ele_jobitem_editor_price_only_preset_prices(table_row_ele){
    let main_ele = document.createElement('div');
    main_ele.classList.add('price-options-container');

    let heading = document.createElement('h6');
    heading.innerHTML = 'Click new price';
    main_ele.append(heading);

    // Note: the purposes of the list and resale buttons are: 1) to speed up entering two common selling prices; 2) to inform the user of those two common prices,
    // to help them identify irregularities on the PO they're processing. The buttons are NOT intended as special pre-validated prices.
    // Validation of prices is outside the scope of this project; users can enter any selling price they wish, so long as it's within the database size limitations.
    // The easiest way for a user to enter any price they wish is via the input cell, but if they'd prefer to open the inspector and fiddle with the settings on 
    // the list and/or resale button, by all means, they can if they like.
    let list_price = table_row_ele.querySelector('.list-price').innerHTML;
    let list_btn = get_price_set_button('list', list_price);
    main_ele.append(list_btn);

    let resale_price = table_row_ele.querySelector('.resale-price').innerHTML;
    let resale_btn = get_price_set_button('resale', resale_price);
    main_ele.append(resale_btn);

    return main_ele;
}


// Price check edit (before): create a button to close the window
function get_price_edit_close_btn(){
    let btn = create_generic_ele_cancel_button();
    btn.addEventListener('click', () => {
        cancel_price_edit_mode()
    });
    return btn;
}

// Price check edit (before): create a p element containing "N x [AB123456] Thingummy Jigger" by grabbing that info from the calling table row
function get_item_desc_from_price_checker(table_row_ele){
    let item_p = document.createElement('p');
    let item_qty = table_row_ele.querySelector('.qty').innerHTML;
    let item_partno = table_row_ele.querySelector('.details-toggle').innerHTML;
    let item_name = table_row_ele.querySelector('.details').innerHTML;
    item_p.innerHTML = `${item_qty} x [${item_partno}] ${item_name}`;
    return item_p;
}

// Price check edit (before): create a button to edit the price to a system-derived value (i.e. list price or standard resale price)
function get_price_set_button(price_type, value_as_str){
    let btn = document.createElement('button');
    btn.classList.add('button-primary-hollow');

    btn.setAttribute('data-new_price', value_as_str.replace(',', ''));
    btn.innerHTML = `${price_type} (${value_as_str})`; 
    btn.addEventListener('click', (e) => {
        edit_price_preset(e);
    });
    return btn;
}

// Price check edit (before): create an input field for the user to edit the price to anything they like
function create_ele_jobitem_editor_price_only_manual_price(){
    let div = document.createElement('div');
    div.classList.add('combo-input-and-button');

    let txt = document.createElement('span');
    txt.innerHTML = 'Or enter your own and submit';
    div.append(txt);

    let input = document.createElement('input');
    input.type = 'number';
    input.step = 0.01;
    input.name = 'new_price';
    div.append(input);

    let btn = create_generic_ele_submit_button();
    btn.addEventListener('click', (e) => {
        edit_price_custom(e);
    });
    div.append(btn);

    return div;
}

// Price check edit (before): close the edit window without changing anything
function cancel_price_edit_mode(){
    let window = document.querySelector('.' + CLASS_PRICE_CHECKER_EDIT_WINDOW);
    window.remove();
    unhide_all_by_class('edit-btn');
}

// Price check edit (action): onclick of a preset button, calls the edit function based on the preset value
function edit_price_preset(e){
    let new_price = e.target.dataset.new_price.replaceAll(',', '');
    edit_price(e.target, new_price);
}

// Price check edit (action): onclick of the submit button following the input, calls the edit function based on the input value
function edit_price_custom(e){
    let input = e.target.previousElementSibling;
    let new_price = input.value.trim();
    edit_price(e.target, new_price);
}

// Price check edit (action): obtain the JobItem ID from the calling <tr> and send it and the price to the server-handling function.
function edit_price(btn, new_price){
    let tr = btn.closest('tr');
    let jiid = tr.id.trim().replace(ID_PREFIX_PRICE_CHECK_ROW, '');

    edit_price_on_server(jiid, new_price);
}

// Price check edit (action): POSTs the data to the server and calls for the page update
function edit_price_on_server(jiid, new_price){
    fetch(`${URL_ITEMS}?id=${jiid}`, {
        method: 'PUT',
        body: JSON.stringify({
            'selling_price': new_price
        }),
        headers: getDjangoCsrfHeaders(),
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        if(data['message']){
            console.log(message);
        }
        else{
            location.reload();
        }
    })
    .catch(error => {
        console.log('Error: ', error);
    })

}

