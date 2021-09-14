/*
    Edit JobItem functions, covering:
        > Entering "edit mode", i.e. creating a form populated with the current info in a "read-only" row
        > Sending the edit form to the server, then updating the DOM to return it to "read-mode" (including price checks)
        > Cancel button to return to read-mode without contacting the server
        > Delete button to remove a JobItem
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

// DOMContentLoaded eventListener additions
document.addEventListener('DOMContentLoaded', function(e) {

    document.querySelectorAll('.ji-delete').forEach(btn => {
        btn.addEventListener('click', function(e){
            delete_job_item(e);
        });
    });

    document.querySelectorAll('.ji-edit').forEach(btn => {
        btn.addEventListener('click', function(e){
            edit_mode_job_item(e);
        });
    });

    document.querySelector('#price_check_table').querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', function(e){
            edit_mode_price_check(e);
        })
    });

});









/* -----------------------------------------------------------------------------------------------------------
    DELETE
-------------------------------------------------------------------------------------------------------------- */
// Delete a job item from the server, then call functions to update DOM
function delete_job_item(e){
    fetch(`/items?id=${e.target.dataset.jiid}&delete=True`, {
        method: 'PUT',
        headers: getDjangoCsrfHeaders(),
        credentials: 'include'
    })
    .then(response => {
        remove_job_item_from_dom(e);
    })
}

// Remove a job item from DOM entirely
function remove_job_item_from_dom(e){
    let jobitem_id = e.target.dataset.jiid;
    let price_check_tr = find_price_check_tr(jobitem_id);
    price_check_tr.remove();

    let job_item_ele = e.target.closest('.' + CLASS_JOBITEM_DIV);
    job_item_ele.remove();
}


















/* -----------------------------------------------------------------------------------------------------------
    EDIT MODE: PHASE I, DISPLAY A FORM
-------------------------------------------------------------------------------------------------------------- */
// Edit JobItem (before): onclick of the edit button, enter "edit mode"
function edit_mode_job_item(e){
    e.preventDefault();

    let display_div = e.target.closest('.' + CLASS_JOBITEM_DIV);
    let edit_form = edit_mode_form(display_div, e.target);

    // Add the edit-mode container to the DOM and hide the display div
    display_div.after(edit_form);
    display_div.classList.add('hide');

    // Move "currency" text from the hidden read_div to a spot near the selling price input
    document.querySelector('#id_' + EDIT_ITEM_ID_PREFIX + 'selling_price').before(display_div.querySelector('.currency'));

    // Hide all the edit buttons, so only one item can be added at a time
    document.querySelectorAll('.ji-edit').forEach(btn => {
        btn.classList.add('hide');
    });
}

// Edit JobItem (before): Create a form element for editing an existing JobItem
function edit_mode_form(display_div, edit_btn){
    // Here's the form
    let edit_mode_form = document.createElement('form');
    edit_mode_form.id = EDIT_ITEM_CONTAINER_ID;

    // Here's the inputs
    for(let i=0; i < JOB_ITEM_INPUT_FIELDS.length; i++){
        // Add a label to the new_item div
        let label = edit_item_label(JOB_ITEM_INPUT_FIELDS[i]);
        edit_mode_form.append(label);

        // Clone the field, adjust the ID/name and populate it with the value from the display div
        var field = edit_item_field_ele(JOB_ITEM_INPUT_FIELDS[i]);
        var preset_value = display_div.querySelector('.' + JOB_ITEM_INPUT_FIELDS[i]).innerHTML;
        if (field.tagName === 'INPUT'){
            field.value = edit_item_preset_input(field, preset_value);

        } else if (field.tagName === 'SELECT'){
            field.selectedIndex = index_from_display_text(field, preset_value);
        }         
        edit_mode_form.append(field);

        // Product dropdown is special: it should have an auto-updating full description underneath
        if('product' === JOB_ITEM_INPUT_FIELDS[i]){
            auto_item_desc_listener(field);
            edit_mode_form.append(get_auto_desc_element());
        }
    }
    
    // Open the doors and here's all the... people? P-imputs?
    // Buttons. Here are the buttons.
    edit_mode_form.append(edit_item_cancel_btn(edit_btn))
    edit_mode_form.append(edit_item_submit_btn(edit_btn));
    return edit_mode_form;
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

// Edit JobItem (before): Revert to read-mode without updating the server
function cancel_item_edit(e){
    let edit_div = document.querySelector('#' + EDIT_ITEM_CONTAINER_ID);
    let result_div = edit_div.previousElementSibling;      
    read_mode_job_item(result_div, edit_div);
}

// Edit JobItem (before): Create a submit button element for the edit form
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

// One liners
function get_form_element_from_job_item_formset(field_name){
    return document.querySelector(`#id_form-${EDIT_ITEM_CLONED_FORMSET_ID}${field_name}`);
}

function edit_item_field_id(prefix, name){
    return 'id_' + prefix + name;
}

function remove_formset_id(str){
    // FYI: this is intended to remove the "-0" formset numbering from names/IDs/whatever
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
    let edit_form = document.querySelector('#' + EDIT_ITEM_CONTAINER_ID);
    let result_div = edit_form.previousElementSibling;

    let prefix = '#id_' + EDIT_ITEM_ID_PREFIX;
    let prl_sel = edit_form.querySelector(prefix + 'price_list')
    let new_info = {};
    new_info['quantity'] = parseInt(edit_form.querySelector(prefix + 'quantity').value.trim());
    new_info['product_id'] = edit_form.querySelector(prefix + 'product').value.trim();
    new_info['price_list'] = prl_sel[prl_sel.selectedIndex].text;
    new_info['selling_price'] = edit_form.querySelector(prefix + 'selling_price').value.trim();

    // PUT it into the database and call functions to handle the DOM
    fetch(`/items?id=${e.target.dataset.jiid}&edit=all`, {
        method: 'PUT',
        //body: JSON.stringify(new_info),
        body: JSON.stringify({
            'quantity': new_info['quantity'],
            'product': new_info['product_id'],
            'price_list': prl_sel.value.trim(),
            'selling_price': new_info['selling_price']
        }),
        headers: getDjangoCsrfHeaders(),
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        update_job_item_in_dom(result_div, edit_form, data, e.target.dataset.jiid, new_info);
    })
    .catch(error =>{
        console.log('Error: ', error);
    });
}


// Edit JobItem (after): Updates one JobItem element in DOM to reflect any/all edits
function update_job_item_in_dom(result_div, edit_div, response_data, jobitem_id, edit_inputs){
    // Check if the product changed and, if so, update the standard accessories
    // Note: Conditional because of vague plans to make standard accessories individually delete-able. Don't want to undo the user's deleting.
    // Note: Ensure this is called before the bit that updates the product field in the display area to match the edit form
    if(product_has_changed(result_div, edit_div)){
        update_standard_accessories_in_dom(result_div, response_data);
    }

    // Update the display area to contain the values from the form
    for(let i = 0; i < JOB_ITEM_INPUT_FIELDS.length; i++){
        update_one_field_in_jobitem_panel_from_edit_all_form(result_div, edit_div, JOB_ITEM_INPUT_FIELDS[i]);
    }

    // Update the auto-description, unless it's blank
    let desc = edit_div.querySelector('.' + AUTO_DESC_CLASS).innerHTML;
    if (desc != ''){
        result_div.querySelector('.' + AUTO_DESC_CLASS).innerHTML = edit_div.querySelector('.' + AUTO_DESC_CLASS).innerHTML;
    }

    // Activate read-mode and update price checks
    read_mode_job_item(result_div, edit_div);
    update_price_check_section_in_dom(response_data, jobitem_id);
}

// Edit JobItem (after): Update a single piece of display text with the contents of an edit form field
function update_one_field_in_jobitem_panel_from_edit_all_form(read_div, edit_div, field_name){
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

// Edit JobItem (after): Remove the edit form and update the read-only div. Called by cancel button and during the post-edit process
function read_mode_job_item(result_div, edit_form){
    // Move currency back to its original position (i.e. before the read-only selling price)
    result_div.querySelector('.selling_price').before(edit_form.querySelector('.currency'));

    // Unhide stuff that's hidden during edit-mode
    result_div.classList.remove('hide');
    document.querySelectorAll('.ji-edit').forEach(btn => {
        btn.classList.remove('hide');
    });

    // Remove the edit form
    // NOTE: Refactoring code? Make sure the line moving the currency element comes before this.
    edit_form.remove();
}

// Edit JobItem (after): see if the edit changed the product
function product_has_changed(read_div, edit_div){
    let result_ele = read_div.querySelector('.product');
    let input_ele = edit_div.querySelector(`#${edit_item_field_id(EDIT_ITEM_ID_PREFIX, 'product')}`);
    return result_ele.innerHTML != input_ele.options[input_ele.selectedIndex].text;
}

// Edit JobItem (after): update the list of standard accessories in the DOM
function update_standard_accessories_in_dom(target_div, response_data){

    // Ascertain the standard accessories status before making any changes to the DOM
    let old_stdAccs_div = target_div.querySelector('.' + STD_ACC_CLASS);
    let old_had_stdAccs = old_stdAccs_div != null;
    let stdAccs_list = response_data.stdAccs;
    let new_wants_stdAccs = stdAccs_list.length > 0;

    // If the new item has stdAccs, create a div displaying those stdAccs and add it to the DOM
    if(new_wants_stdAccs){
        let new_stdAccs_div = get_standard_accessories_div(stdAccs_list);
        let anchor_div = target_div.querySelector('.' + STD_ACC_CONTAINER_CLASS);
        anchor_div.append(new_stdAccs_div);
    }

    // If an old div exists, it's out of date, so remove it
    if(old_had_stdAccs){
        old_stdAccs_div.remove();
    }

    return;
}

// Edit JobItem (after): create a standard accessories div and populate it with a ul of stdAccs
function get_standard_accessories_div(stdAccs_list){
    let div = document.createElement('div');
    div.classList.add(STD_ACC_CLASS);

    let new_p = document.createElement('p');
    new_p.innerHTML = 'includes:';
    div.append(new_p);

    let new_ul = get_ul_with_qty_name(stdAccs_list);        
    div.append(new_ul);

    return div;
}

// Edit JobItem (after): create a ul where each li shows the quantity and the name
function get_ul_with_qty_name(item_list){
    let new_ul = document.createElement('ul');
    for(let i = 0; i < item_list.length; i++){
        var li = document.createElement('li');
        li.innerHTML = `${item_list[i]['quantity']} x ${item_list[i]['name']}`;
        new_ul.append(li);
    }
    return new_ul;
}


// Edit JobItem (after): Get a row in the table for a particular item
function find_price_check_tr(jobitem_id){
    // Note: used for editing AND deleting, so don't get ideas about removing this one liner and incorporating it into the edit function
    return document.querySelector('#' + ID_PREFIX_PRICE_CHECK_ROW + jobitem_id);
}

// Edit JobItem (after): Update the price check section in the DOM
function update_price_check_section_in_dom(server_data, jobitem_id){

    // Update the Price Check summary
    let summary_div = document.querySelector('#price_summary')
    summary_div.querySelector('.selling-price').innerHTML = server_data['total_sold_f'];
    summary_div.querySelector('.list-price').innerHTML = server_data['total_list_f'];
    summary_div.querySelector('.diff-val').innerHTML = server_data['total_list_diff_val_f'];
    summary_div.querySelector('.diff-perc').innerHTML = server_data['total_list_diff_perc'];

    // Update the Price Check table
    let item_row = find_price_check_tr(jobitem_id);
    item_row.querySelector('.edit-btn').dataset.jiid = jobitem_id;

    let desc_td = item_row.querySelector('.description');
    desc_td.querySelector('.details-toggle').innerHTML = server_data['part_number'];
    desc_td.querySelector('.details').innerHTML = server_data['name'];
    
    item_row.querySelector('.selling-price').innerHTML = server_data['selling_price_f'];
    item_row.querySelector('.qty').innerHTML = server_data['quantity'];
    item_row.querySelector('.list-price').innerHTML = server_data['list_price_f'];
    item_row.querySelector('.version').innerHTML = server_data['price_list'];
    item_row.querySelector('.list-diff-val').innerHTML = server_data['list_difference_value_f'];
    item_row.querySelector('.list-diff-perc').innerHTML = `${server_data['list_difference_perc_f']}%`;
    item_row.querySelector('.resale-percentage').innerHTML = `${server_data['resale_percentage']}%`;
    item_row.querySelector('.resale-price').innerHTML = server_data['resale_price_f'];
    item_row.querySelector('.resale-diff-val').innerHTML = server_data['resale_difference_value_f'];
    item_row.querySelector('.resale-diff-perc').innerHTML = `${server_data['resale_difference_perc_f']}%`;
}
















// -------------------------------------------------------------------
// Edit price from price check table
// -------------------------------------------------------------------
// Price check edit (before): onclick of the edit button in the selling price column
function edit_mode_price_check(e){
    let table_row = find_price_check_tr(e.target.dataset.jiid);
    let price_check_edit_window = get_price_check_edit_window(table_row);
    e.target.after(price_check_edit_window);
    hide_all_by_class('edit-btn');
}

// Price check edit (before): creates a window for editing a price
function get_price_check_edit_window(table_row_ele){
    let div = document.createElement('div');
    div.classList.add(CLASS_PRICE_CHECKER_EDIT_WINDOW);

    let h = document.createElement('h5');
    h.innerHTML = 'Edit Price';
    div.append(h);

    let close_btn = get_price_edit_close_btn();
    div.append(close_btn);

    let item_p = get_item_desc_from_price_checker(table_row_ele);
    div.append(item_p);

    // Security note: user may have played silly buggers with the list/resale prices in the DOM, but that's ok.
    // The user is permitted to enter any selling price they wish (you never know when a salesperson will agree to something weird).
    // If the user wishes to accomplish this via fiddling with the preset buttons in the inspector instead of just entering the desired
    // value in the provided input field, sure: they can knock themselves out.
    let list_price = table_row_ele.querySelector('.list-price').innerHTML;
    let list_btn = get_price_set_button('list', list_price);
    div.append(list_btn);

    let resale_price = table_row_ele.querySelector('.resale-price').innerHTML;
    let resale_btn = get_price_set_button('resale', resale_price);
    div.append(resale_btn);
    
    let enter_div = get_price_input_div();
    div.append(enter_div);

    return div;
}

// Price check edit (before): create an X button to close the window
function get_price_edit_close_btn(){
    let btn = document.createElement('button');
    btn.innerHTML = 'X';
    btn.addEventListener('click', (e) => {
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
    btn.setAttribute('data-new_price', value_as_str.replace(',', ''));
    btn.innerHTML = `set price to ${price_type} (${value_as_str})`; 
    btn.addEventListener('click', (e) => {
        edit_price_preset(e);
    });
    return btn;
}

// Price check edit (before): create an input field for the user to edit the price to anything they like
function get_price_input_div(jiid){
    let div = document.createElement('div');
    let txt = document.createTextNode('enter');
    div.append(txt);

    let input = document.createElement('input');
    input.type = 'number';
    input.step = 0.01;
    input.name = 'new_price';
    div.append(input);

    let btn = document.createElement('button');
    btn.innerHTML = 'submit';
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
    let tr = e.target.closest('tr');
    let jiid = extract_jiid_from_price_check_tr_id(tr.id);

    let new_price = e.target.dataset.new_price.replaceAll(',', '');
    
    edit_price_on_server(jiid, new_price);
}

// Price check edit (action): onclick of the submit button following the input, calls the edit function based on the input value
function edit_price_custom(e){
    let tr = e.target.closest('tr');
    let jiid = extract_jiid_from_price_check_tr_id(tr.id);

    let input = e.target.previousElementSibling;
    let new_price = input.value.trim();

    edit_price_on_server(jiid, new_price);
}

// Price check edit (action): take a tr element ID, return the jobitem ID
function extract_jiid_from_price_check_tr_id(tr_id){
    return tr_id.trim().replace(ID_PREFIX_PRICE_CHECK_ROW, '');
}

// Price check edit (action): PUTs the data to the server and calls for the page update
function edit_price_on_server(jiid, new_price){
    fetch(`/items?id=${jiid}&edit=price_only`, {
        method: 'PUT',
        body: JSON.stringify({
            'selling_price': new_price
        }),
        headers: getDjangoCsrfHeaders(),
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        update_price_on_page(jiid, data);
    })
    .catch(error => {
        console.log('Error: ', error);
    })

}




// Price check edit (after): called by the fetch, after the response has been received. Updates the DOM
function update_price_on_page(jiid, data){
    // Update the price check section
    update_price_check_section_in_dom(data, jiid);

    // Update the JobItem pane
    let jobitem_panel = find_jobitem_panel(jiid);
    jobitem_panel.querySelector('.selling_price').innerHTML = data['selling_price_f'];

    // Close the edit window
    cancel_price_edit_mode();
}

// Price check edit (after): find the div corresponding to a particular JobItem ID
function find_jobitem_panel(jiid){
    let buttons = document.querySelectorAll('.ji-edit');
    for(i=0; i < buttons.length; i++){
        var btn = buttons[i];
        if(btn.dataset.jiid == jiid){
            return btn.closest('.job-item-container');
        }
    }
}