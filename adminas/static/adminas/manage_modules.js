CLASS_SLOT_ELEMENT = 'modular-slot-container';
CLASS_MODULE_SLOT = 'module-slot';
CLASS_MODULE_SLOT_EMPTY = 'empty';
CLASS_FILLED_SLOT = 'filled';
CLASS_BUCKET_MENU = 'module-bucket-container';
CLASS_EXCESS_MODULES = 'excess-modules';
CLASS_EDIT_SLOT_FILLER_BTN = 'edit-slot-filler-btn';
CLASS_REMOVE_SLOT_FILLER_BTN = 'remove-from-slot-btn';
CLASS_TEMP_ERROR_MSG = 'temp-warning-msg';



// Add event handlers to elements created by Django
document.addEventListener('DOMContentLoaded', (e) =>{
    document.querySelectorAll('.' + CLASS_MODULE_SLOT + '.' + CLASS_MODULE_SLOT_EMPTY).forEach(div => {
        div.addEventListener('click', (e) =>{
            open_module_bucket_of_options(e);
        })
    });

    document.querySelectorAll('.add-slot').forEach(div =>{
        div.addEventListener('click', (e) =>{
            add_empty_slot(e);
        })
    });

    document.querySelectorAll('.' + CLASS_EDIT_SLOT_FILLER_BTN).forEach(btn =>{
        btn.addEventListener('click', (e) => {
            edit_mode_slot_filler_qty(e);
        })
    });

    document.querySelectorAll('.' + CLASS_REMOVE_SLOT_FILLER_BTN).forEach(btn => {
        btn.addEventListener('click', (e) => {
            remove_jobmodule(e);
        })
    });
});











// -------------------------------------------------------------------
// Adding extra "slots" to the page
// -------------------------------------------------------------------
// Add New Slot: called onclick of a + Slot button
function add_empty_slot(e){
    let slot_ele = e.target.closest('.' + CLASS_SLOT_ELEMENT);
    let contents_ele = slot_ele.querySelector('.contents');
    let new_slot = create_empty_slot_div(e.target.dataset.slot, e.target.dataset.parent);
    contents_ele.append(new_slot);
}

// Add New Slot, plus some delete/cancel operations: create an empty slot div
function create_empty_slot_div(slot_id, parent_id){
    let div = document.createElement('div');
    div.classList.add(CLASS_MODULE_SLOT);
    div.classList.add(CLASS_MODULE_SLOT_EMPTY);

    div.setAttribute('data-slot', slot_id);
    div.setAttribute('data-parent', parent_id);

    let it = document.createElement('i');
    it.innerHTML = 'Click to fill';
    div.append(it);

    div.addEventListener('click', (e) =>{
        open_module_bucket_of_options(e);
    });
    return div;
}














// -------------------------------------------------------------------------------
// Opening the bucket of options
// -------------------------------------------------------------------------------

// Bucket menu: called onClick of an empty slot, opens a "bucket menu" of eligible JobItems and an "add new item" button
async function open_module_bucket_of_options(e){
    let empty_slot_div = get_empty_slot_div(e.target);
    let bucket_div = await create_module_bucket_div(empty_slot_div.dataset.slot, empty_slot_div.dataset.parent);
    empty_slot_div.after(bucket_div);
    
    // Clear any old error messages
    remove_module_qty_errors();
}

// Bucket menu: close the bucket window
function close_module_bucket_of_options(){
    document.querySelector('.' + CLASS_BUCKET_MENU).remove();
}

// Bucket menu: find the div for the "empty slot", regardless of whether what you just clicked counts as that div or a child
function get_empty_slot_div(target){
    if(target.classList.contains(CLASS_MODULE_SLOT_EMPTY)){
        return target;
    } else {
        return target.closest('.' + CLASS_MODULE_SLOT + '.' + CLASS_MODULE_SLOT_EMPTY);
    }
}

// Bucket menu: create a div element for the bucket menu and fill it with stuff created by other functions
async function create_module_bucket_div(slot_id, parent_id){
    // Create bucket div
    let div = document.createElement('div');
    div.classList.add(CLASS_BUCKET_MENU);

    // Fill with other elements
    div.append(get_module_bucket_title());
    div = append_cancel_button(div);
    div = await append_existing_jobitems(div, slot_id, parent_id);
    div = append_new_jobitem_button(div, slot_id, parent_id);
    
    return div;
}

// Bucket menu: Get a h# element for the bucket
function get_module_bucket_title(){
    let h = document.createElement('h4');
    h.innerHTML = 'Options';
    return h;
}

// Bucket menu: Close the bucket menu without doing anything else
function append_cancel_button(div){
    let btn = document.createElement('button');
    btn.classList.add('x-btn');
    btn.innerHTML = 'X';
    btn.addEventListener('click', (e) => {
        close_module_bucket_of_options();
    });
    div.append(btn);
    return div;
}

// Bucket menu: Request a list of elligible existing JobItems, then add appropriate elements to the bucket div 
async function append_existing_jobitems(div, slot_id, parent_id){
    let json_response = await get_list_for_module_slot(slot_id, parent_id, 'jobitems');
    let existing_ji = json_response['data'];

    if(typeof existing_ji === 'undefined'){
        let p = document.createElement('p');
        p.innerHTML = 'There are no unassigned items on this job which are suitable for this slot.';
        div.append(p);
    }
    else{
        let option_bucket = document.createElement('div');
        option_bucket.classList.add('bucket-options-container');
        for(var i=0; i < existing_ji.length; i++){
            var ji_option_div = create_module_bucket_filler_div(slot_id, parent_id, existing_ji[i]);
            option_bucket.append(ji_option_div);
        }
        div.append(option_bucket);
    }
    return div;
}

// Bucket menu: Contact the server to get a list of something relating to module assignments (something can be: JobItems, products or max_quantity)
async function get_list_for_module_slot(slot_id, parent_id, list_type){
    let response = await fetch(`${URL_ASSIGNMENTS}?parent=${parent_id}&slot=${slot_id}&return=${list_type}`)
    .catch(error => {
        console.log('Error: ', error);
    });
    return await response.json();
}

// Bucket menu: Create a div for one JobItem in the bucket
function create_module_bucket_filler_div(slot, parent, data){
    var ji_option_div = document.createElement('div');

    ji_option_div.classList.add('bucket-item');

    if(parseInt(data['quantity']) === 0){
        ji_option_div.classList.add('jobitem_usedup');

    } else {
        ji_option_div.classList.add('jobitem');
        ji_option_div.addEventListener('click', (e) =>{
            assign_jobitem_to_slot(e);
        });
    }

    ji_option_div.setAttribute('data-slot', slot);
    ji_option_div.setAttribute('data-parent', parent);
    ji_option_div.setAttribute('data-child', data['id']);

    ji_option_div.innerHTML = `${data['quantity']} x ${data['name']}`;

    return ji_option_div;
}

// Bucket menu: Add the button to summon a form for entering a new JobItem to the order
function append_new_jobitem_button(div, slot_id, parent_id){
    let btn = document.createElement('button');
    btn.innerHTML = '+ new item to job';

    btn.classList.add('add-new-btn');

    btn.setAttribute('data-slot', slot_id);
    btn.setAttribute('data-parent', parent_id);
    btn.addEventListener('click', (e) => {
        fill_slot_with_new_jobitem_form(e);
    });

    div.append(btn);
    return div;
}




















// --------------------------------------------------------------
// Fill slot with a new JobItem
// -------------------------------------------------------------
// New JI Form: onclick, replaces an empty slot with a form for adding a new item to fill the module
async function fill_slot_with_new_jobitem_form(e){
    let new_div = await get_module_slot_with_new_item_form(e.target.dataset.slot, e.target.dataset.parent);

    let bucket_div = e.target.closest('.' + CLASS_BUCKET_MENU);
    let empty_slot = bucket_div.previousSibling;

    empty_slot.after(new_div);

    empty_slot.remove();
    bucket_div.remove();
}

// New JI Form: create an element with a new item form inside
async function get_module_slot_with_new_item_form(slot_id, parent_id){
    let div = document.createElement('div');
    div.classList.add(CLASS_MODULE_SLOT);
    div.classList.add('new-slot-filler-inputs');

    let qty_fld = get_jobitem_qty_field();
    qty_fld.value = 1;
    div.append(qty_fld);
    div.append(document.createTextNode(' x '));
    div.append(await get_jobitem_module_dropdown(slot_id, parent_id));
    div.append(get_new_slot_filler_submit_btn(slot_id, parent_id));
    div.append(get_new_slot_filler_cancel_btn());

    return div;
}

// New JI Form, Edit Filled Slot: create a quantity field
function get_jobitem_qty_field(){
    let fld = document.createElement('input');
    fld.type = 'number';
    fld.name = 'qty';
    fld.id = 'id_qty';
    fld.required = true;
    fld.min = 1;

    return fld;
}

// New JI Form: get a select element with options from the server (list of products suitable for this slot, in asc price order)
async function get_jobitem_module_dropdown(slot_id, parent_id){
    let sel = document.createElement('select');
    sel.name = 'product';

    let json_response = await get_list_for_module_slot(slot_id, parent_id, 'products');
    let list_of_valid_options = json_response['data'];

    for(let i=0; i < list_of_valid_options.length; i++){
        var opt_data = list_of_valid_options[i];
        var opt = document.createElement('option');
        opt.value = opt_data['id'];
        opt.innerHTML = `${opt_data['name']} @ ${opt_data['price_f']}`;
        sel.append(opt);
    }

    return sel;
}

// New JI Form: get a submit button for the form
function get_new_slot_filler_submit_btn(slot_id, parent_id){
    let btn = document.createElement('button');
    btn.innerHTML = 'submit';
    btn.id = 'id_submit_new';
    btn.setAttribute('data-slot', slot_id);
    btn.setAttribute('data-parent', parent_id);
    btn.addEventListener('click', (e) => {
        add_new_jobitem_and_jobmodule(e);
    });
    return btn;
}

// New JI Form: get a cancel button
function get_new_slot_filler_cancel_btn(){
    let btn = document.createElement('button');
    btn.classList.add('close-new-mode');
    btn.innerHTML = 'cancel';
    btn.addEventListener('click', (e) => {
        close_new_slot_filler_mode(e.target);
    });
    return btn; 
}

// Cancel New JI Form: called onclick of the cancel button. Replaces the form with an empty slot.
function close_new_slot_filler_mode(btn){
    let new_slot_div = btn.closest('.' + CLASS_MODULE_SLOT);

    let submit_btn = new_slot_div.querySelector('#' + 'id_submit_new');
    let empty_slot = create_empty_slot_div(submit_btn.dataset.slot, submit_btn.dataset.parent);

    new_slot_div.after(empty_slot);
    new_slot_div.remove();
    return;
}


// New JI Form Action: onclick of new item submit btn
async function add_new_jobitem_and_jobmodule(e){
    let form_div = e.target.parentElement;

    // Add a new JobItem on the server. This will return the ID of the resulting record, which we'll need later.
    let parent_id = e.target.dataset.parent;
    let qty = form_div.querySelector('input[name="qty"]').value;
    let product_id = form_div.querySelector('select').value;
    let json_resp = await create_new_jobitem_for_module(parent_id, qty, product_id);
    let child_id = json_resp['id'];

    // Add a new JobModule on the server. This will return the ID of the JobModule and data about the slot status.
    let slot_id = e.target.dataset.slot;
    json_resp = await create_jobmodule_on_server(child_id, parent_id, slot_id);
    let jobmod_id = json_resp['id'];

    // Create a "filled slot" div.
    let product_text = get_product_desc_from_select_desc(form_div.querySelector('select'));
    let filled_slot = create_filled_slot(`${qty} x ${product_text}`, qty, slot_id, parent_id, jobmod_id);

    // Everything's ready: update the page
    update_slot_status(form_div, json_resp);
    form_div.after(filled_slot);
    form_div.remove();
}

// New JI Form Action: takes "ABC123456: Thingummyjigger @ GBP 12,3456.00" and extracts the part num and desc
function get_product_desc_from_select_desc(select_ele){
    let desc_with_price = select_ele.options[select_ele.selectedIndex].text;
    let re = /^.+(?=( @ ))/;
    return desc_with_price.match(re)[0];
}

// New JI Form Action: POST new JI info to the server
async function create_new_jobitem_for_module(parent_id, qty, product){
    let response = await fetch('/items', {
        method: 'POST',
        body: JSON.stringify({
            'source_page': 'module_management',
            'quantity': qty,
            'product': product,
            'parent': parent_id
        }),
        headers: getDjangoCsrfHeaders(),
        credentials: 'include'
    })
    .catch(error => {
        console.log('Error: ', error);
    })

    return await response.json();
}


















// ------------------------------------------------------------------------
// Assigning a JobItem to a module
// ------------------------------------------------------------------------
// Assignment (existing JI only): called onClick of one of the existing JobItems in the bucket menu
async function assign_jobitem_to_slot(e){
    let data = await create_jobmodule_on_server(e.target.dataset.child, e.target.dataset.parent, e.target.dataset.slot);
    let jobmod_id = data['id'];

    let bucket_div = e.target.closest('.' + CLASS_BUCKET_MENU);
    let empty_slot = bucket_div.previousSibling;
    
    if(typeof jobmod_id !== 'undefined'){
        let description = e.target.innerHTML;
        let filled_slot = create_filled_slot(description, 1, e.target.dataset.slot, e.target.dataset.parent, jobmod_id);

        update_slot_status(e.target, data);
        empty_slot.after(filled_slot);
        empty_slot.remove();
    } else {
        display_module_qty_error(empty_slot, '0');
    }

    bucket_div.remove();
}




// Assignment: create a new JobModule on the server, storing the relationship between the parent, slot, and child
async function create_jobmodule_on_server(child_id, parent_id, slot_id){  
    let response = await fetch(`${URL_ASSIGNMENTS}`, {
        method: 'POST',
        body: JSON.stringify({
            'parent': parent_id,
            'child': child_id,
            'slot': slot_id
        }),
        headers: getDjangoCsrfHeaders(),
        credentials: 'include'
    })
    .catch(error => {
        console.log('Error: ', error);
    });

    let resp_json = await response.json();
    return resp_json;
}


// Assignment: Create a div to "fill the slot" with the selected JobItem
function create_filled_slot(description, quantity, slot_id, parent_id, jobmod_id){
    let div = document.createElement('div');
    div.classList.add(CLASS_MODULE_SLOT);
    div.classList.add('jobitem');

    div.setAttribute('data-slot', slot_id);
    div.setAttribute('data-parent', parent_id);

    div.append(get_slot_filler_desc_span(description, quantity));
    div.append(get_slot_filler_edit_btn(jobmod_id));
    div.append(get_slot_filler_remove_btn(jobmod_id));
    return div;
}

// Assignment: Creates a span containing "$N x [ABC123456] Thingummy Jigger", where $N is replaced by the second arg to the function
function get_slot_filler_desc_span(description, quantity){
    let re = /^\d+(?=( x ))/g;
    let span = document.createElement('span');
    span.classList.add('child-desc');
    span.innerHTML = description.replace(re, quantity); 
    return span;
}

// Assignment: Create an edit button for a filled slot
function get_slot_filler_edit_btn(jobmod_id){
    let btn = document.createElement('button');
    btn.innerHTML = 'edit';
    btn.classList.add(CLASS_EDIT_SLOT_FILLER_BTN);
    btn.setAttribute('data-jobmod', jobmod_id);
    btn.addEventListener('click', (e) => {
        edit_mode_slot_filler_qty(e);
    })
    return btn;
}

// Assignment: Creates an X button for removing the JobItem from the slot
function get_slot_filler_remove_btn(jobmod_id){
    let btn = document.createElement('button');
    btn.classList.add(CLASS_REMOVE_SLOT_FILLER_BTN);
    btn.innerHTML = 'x';
    btn.setAttribute('data-jobmod', jobmod_id);
    btn.addEventListener('click', (e) => {
        remove_jobmodule(e);
    });
    return btn;
}













// ------------------------------------------------------------------------
// Delete Assignment
// ------------------------------------------------------------------------
// Delete Assignment: called onClick by the [x] button on filled slots. Manages removing a JobItem from a slot
async function remove_jobmodule(e){
    let resp = await unfill_slot_on_server(e);
    unfill_slot_on_page(e, resp);
}

// Delete Assignment: Backend removal of the JobItem from the slot
async function unfill_slot_on_server(e){
    let resp = await fetch(`${URL_ASSIGNMENTS}`, {
        method: 'PUT',
        body: JSON.stringify({
            'action': 'delete',
            'id': e.target.dataset.jobmod
        }),
        headers: getDjangoCsrfHeaders(),
        credentials: 'include'
    })
    .catch(error => {
        console.log('Error: ', error);
    })
    return await resp.json();
}

// Delete Assignment: Frontend removal of the JobItem from the slot
function unfill_slot_on_page(e, data){
    let slot_filler = e.target.parentElement;
    let empty_slot = create_empty_slot_div(slot_filler.dataset.slot, slot_filler.dataset.parent);
    slot_filler.after(empty_slot);
    update_slot_status(e.target, data);

    slot_filler.remove();
}















// -----------------------------------------------------------------------------
// Edit mode for filled slots
// -----------------------------------------------------------------------------
// Edit Filled Slot: Called onClick of the [edit] button on a filled slot
function edit_mode_slot_filler_qty(e){
    // Find the "main" slot div and the span with the display text
    let filler_div = e.target.closest('.module-slot');
    let desc_span = filler_div.querySelector('.child-desc');

    // Prep values, then call a function to generate a suitable edit-mode form
    let jobmod_id = e.target.dataset.jobmod;
    let filler_text = desc_span.innerHTML;
    let re = get_qty_re();
    let qty_form = get_slot_filler_edit_field(jobmod_id, filler_text, re);

    // Add the qty form and a cancel button in front of the display text span, then edit the display text to remove the qty
    desc_span.before(qty_form);
    desc_span.before(get_qty_submit_btn()); // This uses "previousSibling" to access qty_form
    desc_span.before(get_cancel_edit_btn());
    desc_span.innerHTML = filler_text.replace(re, '');

    // Hide all the edit and remove buttons
    hide_all_by_class(CLASS_EDIT_SLOT_FILLER_BTN);
    hide_all_by_class(CLASS_REMOVE_SLOT_FILLER_BTN);
}

// Edit Filled Slot: Used to toggle edit and remove buttons, so user can only edit one slot at a time
function hide_all_by_class(classname){
    document.querySelectorAll('.' + classname).forEach(ele => {
        ele.classList.add('hide');
    });   
}

// Edit Filled Slot: Used to toggle edit and remove buttons back on, after editing is complete
function unhide_all_by_class(classname){
    document.querySelectorAll('.' + classname).forEach(ele => {
        ele.classList.remove('hide');
    });   
}


// Edit mode: create a "form" for editting the qty
function get_slot_filler_edit_field(jobmod_id, filler_text, re){
    let fld = get_jobitem_qty_field();
    fld.value = filler_text.match(re);
    fld.setAttribute('data-id', jobmod_id);
    fld.setAttribute('data-prev_qty', filler_text.match(re));

    fld.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            update_module_qty(e.target);
        }
    });

    return fld;
}

// Edit mode: submit button for the "form"
function get_qty_submit_btn(){
    let btn = document.createElement('button');
    btn.innerHTML = 'submit';
    btn.id = 'id_submit_qty_edit';
    btn.addEventListener('click', (e) => {
        update_module_qty(e.target.previousSibling);
    });
    return btn;
}

// Edit mode: button to cancel edit mode
function get_cancel_edit_btn(){
    let btn = document.createElement('button');
    btn.classList.add('close-edit-mode');
    btn.innerHTML = 'cancel';
    btn.addEventListener('click', (e) => {
        close_edit_mode(e.target);
    });
    return btn;
}

// Edit mode, close: called onclick of the cancel button, exits edit mode on the page without troubling the server
function close_edit_mode(ele, new_qty){
    // Find the parent filler div, then work from there
    let filler_div = ele.closest('.module-slot');

    let edit_form = filler_div.querySelector('input');
    let qty_txt = edit_form.dataset.prev_qty;
    if (typeof new_qty != 'undefined'){
        qty_txt = new_qty;
    }
    edit_form.remove();
   
    let submit_btn = filler_div.querySelector('#id_submit_qty_edit');
    submit_btn.remove();

    let cancel_btn = filler_div.querySelector('.close-edit-mode');   
    cancel_btn.remove();
    
    let desc_span = filler_div.querySelector('.child-desc');
    desc_span.innerHTML = qty_txt + desc_span.innerHTML;

    unhide_all_by_class(CLASS_EDIT_SLOT_FILLER_BTN);
    unhide_all_by_class(CLASS_REMOVE_SLOT_FILLER_BTN);
    remove_module_qty_errors();
}


// Edit Mode Action: called onclick of the submit button
function update_module_qty(qty_field){
    fetch(`${URL_ASSIGNMENTS}`, {
        method: 'PUT',
        body: JSON.stringify({
            'action': 'edit_qty',
            'qty': qty_field.value,
            'prev_qty': qty_field.dataset.prev_qty,
            'id': qty_field.dataset.id
        }),
        headers: getDjangoCsrfHeaders(),
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        if(typeof data['max_qty'] === 'undefined'){
            update_module_qty_on_page(qty_field, data);
        } else {
            display_module_qty_error(qty_field, data['max_qty']);
        }
    })
    .catch(error => {
        console.log('Error: ', error)
    });
}


// Edit Mode: Update the qty in the filled div, then get rid of the edit "form"
function update_module_qty_on_page(qty_field, data){
    // input=number allows some inputs that can be valid as part of a number, but aren't numbers on their own (e.g. 'e', '-')
    // If the user enters something unsuitable, the server will ignore it, so ignore it on the page too: close the form as it it were cancelled
    if(qty_field.value === '' || parseFloat(qty_field.value) <= 0){
        close_edit_mode(qty_field);
        return;
    }

    // Otherwise update slot status and close edit mode, sending the qty field to the function so it can replace the quantity in the display text
    update_slot_status(qty_field, data);
    close_edit_mode(qty_field, qty_field.value);   
}

// Edit Mode: users are not allowed to add new JobItems via edit mode on the module management page. If they try, display a warning.
function display_module_qty_error(preceding_ele, remaining_qty_str){
    let error_msg = document.createElement('div');
    error_msg.classList.add(CLASS_TEMP_ERROR_MSG);
    error_msg.innerHTML = `Not enough items (${remaining_qty_str} remaining)`;
    preceding_ele.after(error_msg);
}

// Edit Mode: remove the error message. (This is called when opening the bucket menu and when closing edit mode,
//                                        i.e. when the user indicates they're doing something to fix it)
function remove_module_qty_errors(){
    document.querySelectorAll('.' + CLASS_TEMP_ERROR_MSG).forEach(div => {
        div.remove();
    });
}

























// --------------------------------------------------------------------------------
// Slot Status Indicators
// --------------------------------------------------------------------------------
// Slot Status: called during create, edit and delete, i.e. anything that can alter the slot status
function update_slot_status(ele, data){
    // Update the JobItem
    let jobitem_ele = ele.closest('.modular-item-container');
    update_excess_modules_css(jobitem_ele, data['jobitem_has_excess']);

    // Update the indicators in the "spine"
    let slot_ele = ele.closest('.' + CLASS_SLOT_ELEMENT);
    update_excess_modules_css(slot_ele, parseInt(data['slot_num_excess']) > 0);
    update_slot_status_indicator(slot_ele, 'required', data['required_str']);
    update_slot_status_indicator(slot_ele, 'optional', data['optional_str']);
    update_excess_slot_status_indicator(slot_ele, 'excess', data['slot_num_excess']);

    return;
}

// Slot Status: toggle the "excess" CSS class on and off as needed
function update_excess_modules_css(element, has_excess){
    if(has_excess){
        if(!element.classList.contains(CLASS_EXCESS_MODULES)){
            element.classList.add(CLASS_EXCESS_MODULES);
        }
    } else {
        if(element.classList.contains(CLASS_EXCESS_MODULES)){
            element.classList.remove(CLASS_EXCESS_MODULES);
        }
    }
    return;
}

// Slot Status: Update numbers and CSS in indicators (for req and opt indicators)
function update_slot_status_indicator(slot_ele, class_indicator, display_text){
    let indicator_ele = slot_ele.querySelector('.' + class_indicator)
    let text_ele = indicator_ele.querySelector('.body');

    text_ele.innerHTML = display_text;
    text_is_full = display_text_shows_full_slot(display_text);
    css_is_full = indicator_ele.classList.contains(CLASS_FILLED_SLOT);

    if(text_is_full && !css_is_full){
        indicator_ele.classList.add(CLASS_FILLED_SLOT);
    }
    else if(!text_is_full && css_is_full){
        indicator_ele.classList.remove(CLASS_FILLED_SLOT);
    } 

    return;
}

// Slot Status: check if the indicator shows a full slot
function display_text_shows_full_slot(text){
    let str_arr = text.split('/');
    return str_arr[0] === str_arr[1];
}


// Slot status: update the number (for excess indicator)
function update_excess_slot_status_indicator(slot_ele, class_indicator, display_text){
    // The excess indicator is a bit special. It's /removed/ when the value is 0; it only displays the total excess (i.e. "2" instead of "2/0")
    let excess_indicator = slot_ele.querySelector('.' + class_indicator);
    let does_exist = excess_indicator !== null;
    let should_exist = parseInt(display_text) > 0;

    if (!should_exist && !does_exist){
        // All is ok as it is, so do nothing.
        return;

    } else if (!should_exist && does_exist){
        // Excess indicator is no longer required. Remove it.
        slot_ele.querySelector('.' + class_indicator).remove();
        return;

    } else if(should_exist && !does_exist){
        // Excess indicator is missing. Create it.
        let div = create_module_excess_indicator(display_text);
        let target = slot_ele.querySelector('.slot-info');
        target.append(div);
        return;

    } else {
        // It's there and needs an update to the text (but not the CSS, so don't get any ideas about reusing the function handling req and opt)
        let result_ele = slot_ele.querySelector('.' + class_indicator).querySelector('.body');
        result_ele.innerHTML = display_text;
    }
} 


// Slot Status: create a new excess indicator div
function create_module_excess_indicator(num_excess){
    let div = document.createElement('div');
    div.classList.add('excess');  

    let head_span = document.createElement('span');
    head_span.classList.add('head');
    head_span.innerHTML = 'excess';
    div.append(head_span);

    let body_span = document.createElement('span');
    body_span.classList.add('body');
    body_span.innerHTML = num_excess;
    div.append(body_span);

    return div;
}








