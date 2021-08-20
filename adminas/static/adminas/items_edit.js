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

// DOMContentLoaded eventListener additions
document.addEventListener('DOMContentLoaded', function(e) {
    document.querySelectorAll('.ji-edit').forEach(btn => {
        btn.addEventListener('click', function(e){
            edit_mode_job_item(e);
        });
    });
    document.querySelectorAll('.ji-delete').forEach(btn => {
        btn.addEventListener('click', function(e){
            delete_job_item(e);
        });
    });
});









/* -----------------------------------------------------------------------------------------------------------
    EDIT MODE: PHASE I, DISPLAY A FORM
-------------------------------------------------------------------------------------------------------------- */
// Enter "edit mode" by hiding the display text and creating/adding an edit form
function edit_mode_job_item(e){
    e.preventDefault();

    let display_div = e.target.closest('.job-item-container');
    let edit_form = edit_mode_form(display_div, e.target);

    // Add the edit-mode container to the DOM and hide the display div
    display_div.after(edit_form);
    display_div.classList.add('hide');

    // Move "currency" text from the hidden read_div to a spot near the selling price input
    document.querySelector('#id_' + EDIT_ITEM_ID_PREFIX + 'selling_price').before(display_div.querySelector('.currency'));

    // Hide all the other edit buttons, so only one item can be added at a time
    document.querySelectorAll('.ji-edit').forEach(btn => {
        btn.classList.add('hide');
    });
}

// Create a form element for editing an existing JobItem
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

// Create a label element for the edit form
function edit_item_label(field_name){
    var original = get_form_element_from_job_item_formset(field_name);
    var label = original.previousElementSibling.cloneNode(true);
    label.htmlFor = remove_formset_id(label.htmlFor);
    return label;
}

// Create an input/select element for the edit form via cloning the field added by Django
function edit_item_field_ele(my_field){
    var original = get_form_element_from_job_item_formset(my_field);
    var field = original.cloneNode(true);
    field.id = edit_item_field_id(EDIT_ITEM_ID_PREFIX, my_field);
    field.name = remove_formset_id(field.name); 
    return field;   
}

// Retrieve the appropriately formatted preset input for the different types of edit item fields
function edit_item_preset_input(field, value){
    if(field.type === 'number' && field.step === '0.01'){
        return parseFloat(value.replaceAll(',', '')).toFixed(2);

    } else if (field.type === 'number'){
        return parseInt(value.replaceAll(',', ''));   
    }
    return value;
}

// Create a cancel button element for the edit form
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

// Revert to read-mode without updating the server
function cancel_item_edit(e){
    let edit_div = document.querySelector('#' + EDIT_ITEM_CONTAINER_ID);
    let result_div = edit_div.previousElementSibling;      
    read_mode_job_item(result_div, edit_div);
}

// Create a submit button element for the edit form
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
// Update the JobItem on the server, then call functions to update the DOM
function update_job_item(e){
    // This is called by the submit button on the JS-created edit form
    e.preventDefault();

    // Find the div with the "form" and the div where the results should be displayed
    let edit_form = document.querySelector('#' + EDIT_ITEM_CONTAINER_ID);
    let result_div = edit_form.previousElementSibling;

    // PUT it into the database and call functions to handle the DOM
    let prefix = '#id_' + EDIT_ITEM_ID_PREFIX;
    fetch(`/items?id=${e.target.dataset.jiid}`, {
        method: 'PUT',
        body: JSON.stringify({
            'quantity': parseInt(edit_form.querySelector(prefix + 'quantity').value.trim()),
            'product': edit_form.querySelector(prefix + 'product').value.trim(),
            'price_list': edit_form.querySelector(prefix + 'price_list').value.trim(),
            'selling_price': edit_form.querySelector(prefix + 'selling_price').value.trim()
        }),
        headers: getDjangoCsrfHeaders(),
        credentials: 'include'
    })
    .then(response => response.json())
    .then(response_data => {
        update_job_item_in_dom(result_div, edit_form, response_data);
    })
    .catch(error =>{
        console.log('Error: ', error);
    });
}


// Updates one JobItem element in DOM to reflect any/all edits
function update_job_item_in_dom(result_div, edit_div, response_data){

    // Check if the product changed and, if so, update the standard accessories
    // Note: Conditional because of vague plans to make standard accessories individually delete-able. Don't want to undo the user's deleting.
    // Note: Ensure this is called before the bit that updates the product field in the display area to match the edit form
    /*if(product_has_changed(result_div, edit_div)){
        update_standard_accessories(result_div, jobitem_id)
    }*/

    // Update the display area to contain the values from the form
    for(let i = 0; i < JOB_ITEM_INPUT_FIELDS.length; i++){
        update_one_item_field_in_dom(result_div, edit_div, JOB_ITEM_INPUT_FIELDS[i]);
    }

    // Update the auto-description, unless it's blank
    let desc = edit_div.querySelector('.' + AUTO_DESC_CLASS).innerHTML;
    if (desc != ''){
        result_div.querySelector('.' + AUTO_DESC_CLASS).innerHTML = edit_div.querySelector('.' + AUTO_DESC_CLASS).innerHTML;
    }

    // Activate read-mode and update price checks
    read_mode_job_item(result_div, edit_div);
    update_price_checks_in_dom(result_div, response_data);
}

// Update a single piece of display text with the contents of an edit form field
function update_one_item_field_in_dom(read_div, edit_div, field_name){
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

// Remove the edit form and update the read-only div. Called by cancel button and during the post-edit process
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

// Update the DOM with a set of price check info
function update_price_checks_in_dom(price_info, result_div){
    let list_div = result_div.querySelector('.check-list');
    list_div.querySelector('.price').innerHTML = price_info['list_price_f'];
    list_div.querySelector('.diff-val').innerHTML = price_info['list_difference_value_f'];
    list_div.querySelector('.diff-perc').innerHTML = `${price_info['list_difference_perc_f']}%`;

    let resale_div = result_div.querySelector('.check-resale');
    resale_div.querySelector('.percentage').innerHTML = `${price_info['resale_percentage']}%`;
    resale_div.querySelector('.price').innerHTML = price_info['resale_price_f'];
    resale_div.querySelector('.diff-val').innerHTML = price_info['resale_difference_value_f'];
    resale_div.querySelector('.diff-perc').innerHTML = `${price_info['resale_difference_perc_f']}%`;

    let summary_div = document.querySelector('#price_summary')
    summary_div.querySelector('.selling-price').innerHTML = price_info['total_sold_f'];
    summary_div.querySelector('.list-price').innerHTML = price_info['total_list_f'];
    summary_div.querySelector('.diff-val').innerHTML = price_info['total_list_diff_val_f'];
    summary_div.querySelector('.diff-perc').innerHTML = price_info['total_list_diff_perc'];
}










/* -----------------------------------------------------------------------------------------------------------
    DELETE
-------------------------------------------------------------------------------------------------------------- */
// Delete a job item from the server, then call functions to update DOM
function delete_job_item(e){
    // Prepare for CSRF authentication
    var csrftoken = getCookie('csrftoken');
    var headers = new Headers();
    headers.append('X-CSRFToken', csrftoken);    

    fetch(`/items?id=${e.target.dataset.jiid}&delete=True`, {
        method: 'PUT',
        headers: headers,
        credentials: 'include'
    })
    .then(response => {
        remove_job_item_from_dom(e);
    })
}

// Remove a job item from DOM entirely
function remove_job_item_from_dom(e){
    job_item_ele = e.target.closest('.job-item-container');
    job_item_ele.remove();
}






/* -----------------------------------------------------------------------------------------------------------
    working area
-------------------------------------------------------------------------------------------------------------- */

function product_has_changed(read_div, edit_div){
    let result_ele = read_div.querySelector(`.product`);
    let input_ele = edit_div.querySelector(`#${edit_item_field_id(EDIT_ITEM_ID_PREFIX, 'product')}`);

    return result_ele.innerHTML == input_ele.options[input_ele.selectedIndex].text;
}

function update_standard_accessories(target_div, jobitem_id){
    fetch(`/standard_accessories?ji_id=${jobitem_id}`)
    .then(response => response.json())
    .then(stdacc_list => {
        //update_standard_accessories_in_dom(target_div, stdacc_list)
        console.log(stdacc_list);
    })
    .catch(error =>{
        console.log('Error: ', error);
    });
}

function update_standard_accessories_in_dom(target_div, stdaccs){
    let display_ul = target_div.querySelector('.' + STD_ACC_CLASS).getElementsByTagName('UL');

    let new_ul = document.createElement('ul');
    for(let i = 0; i < stdaccs.length; i++){
        var li = document.createElement('li');
        li.innerHTML = `${stdaccs[i]['quantity']} x ${stdaccs[i]['product']}`;
        new_ul.append(li);
    }

    display_ul.before(new_ul);
    display_ul.remove();
}





