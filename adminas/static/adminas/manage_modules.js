/*
    Module Management page functionality.
        > Click an empty slot to open a panel with options to assign an existing JobItem to the slot or create a new JobItem
            >> Adding a new JobItem opens a form inside the slot
        > Click the "+Slot" button to add more slots of a particular type.
        > Edit an existing slot
*/


const CLASS_SLOT_ELEMENT = 'modular-slot-container';
const CLASS_MODULE_SLOT = 'module-slot';
const CLASS_MODULE_SLOT_EMPTY = 'empty';
const CLASS_FILLED_SLOT = 'filled';
const CLASS_MODULE_SLOT_FILLER_POPOUT_MENU = 'module-bucket-container';
const CLASS_EXCESS_MODULES = 'excess-modules';
const CLASS_EDIT_SLOT_FILLER_BTN = 'edit-slot-filler-btn';
const CLASS_REMOVE_SLOT_FILLER_BTN = 'remove-from-slot-btn';
const CLASS_TEMP_ERROR_MSG = 'temp-warning-msg';

const ID_EDIT_FORM_SUBMIT_BUTTON = 'id_submit_qty_edit';
const CSS_CLASS_EDIT_MODE_SLOT = 'editing';

const CLASS_PRODUCT_DESC = 'product_desc';
const CLASS_FILLER_OPTION = 'bucket-item';
const CLASS_PARENT_ITEM = 'modular-item-container';

// Add event handlers to elements created by Django
document.addEventListener('DOMContentLoaded', (e) =>{

    document.querySelectorAll('.' + CLASS_MODULE_SLOT + '.' + CLASS_MODULE_SLOT_EMPTY).forEach(div => {
        div.addEventListener('click', (e) =>{
            open_module_slot_filler_popout(e);
        })
    });

    document.querySelectorAll('.add-slot').forEach(div =>{
        div.addEventListener('click', (e) =>{
            add_empty_module_slot_to_page(e);
        })
    });

    document.querySelectorAll('.' + CLASS_EDIT_SLOT_FILLER_BTN).forEach(btn =>{
        btn.addEventListener('click', (e) => {
            edit_mode_slot_filler_qty(e);
        })
    });
});






// General Support: create an empty slot div
function create_ele_empty_module_slot(slot_id, parent_id){
    let div = document.createElement('div');
    div.classList.add(CLASS_MODULE_SLOT);
    div.classList.add(CLASS_MODULE_SLOT_EMPTY);

    div.setAttribute('data-slot', slot_id);
    div.setAttribute('data-parent', parent_id);

    let it = document.createElement('i');
    it.innerHTML = 'Click to fill';
    div.append(it);

    div.addEventListener('click', (e) =>{
        open_module_slot_filler_popout(e);
    });
    return div;
}





// -------------------------------------------------------------------
// Adding extra "slots" to the page
// -------------------------------------------------------------------
// Add New Slot: called onclick of a + Slot button
function add_empty_module_slot_to_page(e){
    let slot_ele = e.target.closest('.' + CLASS_SLOT_ELEMENT);
    let contents_ele = slot_ele.querySelector('.contents');
    let new_slot = create_ele_empty_module_slot(e.target.dataset.slot, e.target.dataset.parent);
    contents_ele.append(new_slot);
}













// -------------------------------------------------------------------------------
// Opening the bucket of options
// -------------------------------------------------------------------------------

// Module Slot Filler: called onClick of an empty slot, opens a "bucket menu" of eligible JobItems and an "add new item" button
async function open_module_slot_filler_popout(e){
    let empty_slot_div = find_empty_module_slot_div(e.target);
    let bucket_div = await create_ele_module_slot_filler(empty_slot_div.dataset.slot, empty_slot_div.dataset.parent);
    empty_slot_div.after(bucket_div);
    
    // Clear any old error messages
    remove_module_qty_errors();
}

// Module Slot Filler: close the bucket window
function close_module_slot_filler_popout(){
    document.querySelector('.' + CLASS_MODULE_SLOT_FILLER_POPOUT_MENU).remove();
}

// Module Slot Filler: find the div for the "empty slot", regardless of whether the clicked element counts as that div or a child of the div
function find_empty_module_slot_div(target){
    if(target.classList.contains(CLASS_MODULE_SLOT_EMPTY)){
        return target;
    } else {
        return target.closest('.' + CLASS_MODULE_SLOT + '.' + CLASS_MODULE_SLOT_EMPTY);
    }
}

// Module Slot Filler: create a div element for the bucket menu and fill it with stuff created by other functions
async function create_ele_module_slot_filler(slot_id, parent_id){
    // Create bucket div
    let div = document.createElement('div');
    div.classList.add(CLASS_MODULE_SLOT_FILLER_POPOUT_MENU);
    div.classList.add(CSS_GENERIC_PANEL);
    div.classList.add(CSS_GENERIC_FORM_LIKE);
    div.classList.add('popout');

    // Fill with other elements
    let json_response = await get_list_for_module_slot(slot_id, parent_id, 'jobitems');

    div.append(create_ele_module_filler_cancel_button());
    div.append(create_ele_module_filler_title(json_response['data'].parent_quantity));
    div = append_existing_jobitems(div, slot_id, parent_id, json_response['data']);
    div.append(create_ele_module_filler_new_jobitem_button(slot_id, parent_id));
    
    return div;
}

// Module Slot Filler: Get a h# element for the bucket
function create_ele_module_filler_title(parent_quantity){
    let h = document.createElement('h4');
    h.classList.add(CSS_GENERIC_PANEL_HEADING);
    h.innerHTML = `Assign ${parent_quantity} x ...`;
    return h;
}

// Module Slot Filler: Close the bucket menu without doing anything else
function create_ele_module_filler_cancel_button(){
    let btn = create_generic_ele_cancel_button();

    btn.addEventListener('click', (e) => {
        close_module_slot_filler_popout();
    });

    return btn;
}

// Module Slot Filler: Request a list of elligible existing JobItems, then add appropriate elements to the bucket div 
function append_existing_jobitems(div, slot_id, parent_id, json_data){
    let existing_ji = json_data.options;

    if(existing_ji.length === 0){
        let p = document.createElement('p');
        p.innerHTML = 'There are no unassigned items on this job which are suitable for this slot.';
        div.append(p);
    }
    else{
        let option_bucket = document.createElement('div');
        option_bucket.classList.add('bucket-options-container');
        for(var i=0; i < existing_ji.length; i++){
            var ji_option_div = create_ele_module_filler_option(slot_id, parent_id, existing_ji[i], parseInt(json_data.parent_quantity));
            option_bucket.append(ji_option_div);
        }
        div.append(option_bucket);
    }
    return div;
}

// Module Slot Filler: Contact the server to get a list of something relating to module assignments (something can be: JobItems, products or max_quantity)
async function get_list_for_module_slot(slot_id, parent_id, list_type){
    let response = await fetch(`${URL_ASSIGNMENTS}?parent=${parent_id}&slot=${slot_id}&return=${list_type}`)
    .catch(error => {
        console.log('Error: ', error);
    });
    return await response.json();
}



// Module Slot Filler: Create a div for one JobItem in the bucket
function create_ele_module_filler_option(slot, parent, data, qty){
    var ji_option_div = document.createElement('div');

    ji_option_div.classList.add(CLASS_FILLER_OPTION);

    if(qty > parseInt(data['quantity_available'])){
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

    desc_span = document.createElement('span');
    desc_span.classList.add(CLASS_PRODUCT_DESC);
    desc_span.innerHTML = data['name'];

    availability = document.createTextNode(` (${data['quantity_available']}/${data['quantity_total']} available)`);

    ji_option_div.append(desc_span);
    ji_option_div.append(availability);

    return ji_option_div;
}

// Module Slot Filler: Add the button to summon a form for entering a new JobItem to the order
function create_ele_module_filler_new_jobitem_button(slot_id, parent_id){
    let btn = document.createElement('button');
    btn.innerHTML = 'new item to job';

    btn.classList.add('add-button');
    btn.classList.add('module');

    btn.setAttribute('data-slot', slot_id);
    btn.setAttribute('data-parent', parent_id);
    btn.addEventListener('click', (e) => {
        fill_slot_with_new_jobitem_form(e);
    });

    return btn;
}




















// --------------------------------------------------------------
// Fill slot with a new JobItem
// -------------------------------------------------------------
// New JI Form: onclick, replaces an empty slot with a form for adding a new item to fill the module
async function fill_slot_with_new_jobitem_form(e){
    let new_div = await get_module_slot_with_new_item_form(e.target.dataset.slot, e.target.dataset.parent);

    let bucket_div = e.target.closest('.' + CLASS_MODULE_SLOT_FILLER_POPOUT_MENU);
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

    div.append(create_ele_slot_filler_cancel_btn());
    div.append(await create_ele_jobitem_module_dropdown(slot_id, parent_id));

    let subdiv = document.createElement('div');
    subdiv.classList.add('combo-input-and-button');
    let qty_fld = get_jobitem_qty_field();
    qty_fld.value = 1;
    subdiv.append(qty_fld);

    subdiv.append(create_ele_slot_filler_submit_btn(slot_id, parent_id));
    div.append(subdiv);

    return div;
}


// New JI Form: get a select element with options from the server (list of products suitable for this slot, in asc price order)
async function create_ele_jobitem_module_dropdown(slot_id, parent_id){
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
function create_ele_slot_filler_submit_btn(slot_id, parent_id){
    let btn = create_generic_ele_submit_button();

    btn.id = 'id_submit_new';
    btn.setAttribute('data-slot', slot_id);
    btn.setAttribute('data-parent', parent_id);
    btn.addEventListener('click', (e) => {
        add_new_jobitem_and_jobmodule(e);
    });

    return btn;
}


// New JI Form: get a cancel button
function create_ele_slot_filler_cancel_btn(){
    let btn = create_generic_ele_cancel_button();

    btn.addEventListener('click', (e) => {
        close_new_slot_filler_mode(e.target);
    });

    return btn; 
}


// Cancel New JI Form: called onclick of the cancel button. Replaces the form with an empty slot.
function close_new_slot_filler_mode(btn){
    let new_slot_div = btn.closest('.' + CLASS_MODULE_SLOT);

    let submit_btn = new_slot_div.querySelector('#' + 'id_submit_new');
    let empty_slot = create_ele_empty_module_slot(submit_btn.dataset.slot, submit_btn.dataset.parent);

    new_slot_div.after(empty_slot);
    new_slot_div.remove();
    return;
}


// New JI Form Action: onclick of new item submit btn
async function add_new_jobitem_and_jobmodule(e){
    let form_div = e.target.closest('.new-slot-filler-inputs');

    // Add a new JobItem on the server. This will return the ID of the resulting record, which we'll need later.
    let parent_id = e.target.dataset.parent;
    let parent_ele = e.target.closest(`.${CLASS_PARENT_ITEM}`);
    let assignment_qty = form_div.querySelector('input[name="qty"]').value
    let total_qty =  assignment_qty * parent_ele.dataset.quantity;
    let product_id = form_div.querySelector('select').value;
    let json_resp = await create_new_jobitem_for_module(parent_id, total_qty, product_id);
    let child_id = json_resp['id'];

    // Add a new JobModule on the server. This will return the ID of the JobModule and data about the slot status.
    let slot_id = e.target.dataset.slot;
    json_resp = await create_jobmodule_on_server(child_id, parent_id, slot_id, assignment_qty);
    let jobmod_id = json_resp['id'];

    // Create a "filled slot" div.
    let product_text = get_product_desc_from_select_desc(form_div.querySelector('select'));
    let filled_slot = create_ele_filled_module_slot(`${assignment_qty} x ${product_text}`, assignment_qty, slot_id, parent_id, jobmod_id);

    // Everything's ready: update the page
    update_slot_status(form_div, json_resp);
    form_div.after(filled_slot);
    form_div.remove();
}

// New JI Form Action: takes "ABC123456: Thingummyjigger @ GBP 12,3456.00" and extracts the first bit with the part num and desc
function get_product_desc_from_select_desc(select_ele){
    let desc_with_price = select_ele.options[select_ele.selectedIndex].text;
    let re = /^.+(?=( @ ))/;
    return desc_with_price.match(re)[0];
}

// New JI Form Action: POST new JI info to the server
async function create_new_jobitem_for_module(parent_id, qty, product){
    let response = await fetch(`${URL_ITEMS}`, {
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
    if(e.target.classList.contains(CLASS_FILLER_OPTION)){
        ele = e.target;
    }
    else{
        ele = e.target.closest(`.${CLASS_FILLER_OPTION}`);
    }

    let data = await create_jobmodule_on_server(ele.dataset.child, ele.dataset.parent, ele.dataset.slot);
    let jobmod_id = data['id'];

    let bucket_div = e.target.closest('.' + CLASS_MODULE_SLOT_FILLER_POPOUT_MENU);
    let empty_slot = bucket_div.previousSibling;
    let parent_ele = e.target.closest(`.${CLASS_PARENT_ITEM}`);

    if(typeof jobmod_id !== 'undefined'){
        let description = `${parent_ele.dataset.quantity} x ${ele.querySelector(`.${CLASS_PRODUCT_DESC}`).innerHTML}`;
        let filled_slot = create_ele_filled_module_slot(description, 1, ele.dataset.slot, ele.dataset.parent, jobmod_id);

        update_slot_status(e.target, data);
        empty_slot.after(filled_slot);
        empty_slot.remove();
    } else {
        display_module_qty_error(empty_slot, '0');
    }

    bucket_div.remove();
}


// Assignment: create a new JobModule on the server, storing the relationship between the parent, slot, and child
async function create_jobmodule_on_server(child_id, parent_id, slot_id, quantity=1){ 
    let response = await fetch(`${URL_ASSIGNMENTS}`, {
        method: 'POST',
        body: JSON.stringify({
            'parent': parent_id,
            'child': child_id,
            'slot': slot_id,
            'quantity': quantity
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
function create_ele_filled_module_slot(description, quantity, slot_id, parent_id, jobmod_id){
    let div = document.createElement('div');
    div.classList.add(CLASS_MODULE_SLOT);
    div.classList.add('jobitem');

    div.setAttribute('data-slot', slot_id);
    div.setAttribute('data-parent', parent_id);

    div.append(create_ele_slot_filler_desc_span(description, quantity));
    div.append(create_ele_slot_filler_edit_btn(jobmod_id));
    return div;
}


// Assignment: Creates a span containing "$N x [ABC123456] Thingummy Jigger", where $N is replaced by the second arg to the function
function create_ele_slot_filler_desc_span(description, quantity){
    let re = QTY_RE;
    let span = document.createElement('span');
    span.classList.add('child-desc');
    span.innerHTML = description.replace(re, quantity); 
    return span;
}


// Assignment: Create an edit button for a filled slot
function create_ele_slot_filler_edit_btn(jobmod_id){
    let btn = create_generic_ele_edit_button();

    btn.setAttribute('data-jobmod', jobmod_id);
    btn.addEventListener('click', (e) => {
        edit_mode_slot_filler_qty(e);
    })
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
    let resp = await fetch(`${URL_ASSIGNMENTS}?id=${e.target.dataset.jobmod}`, {
        method: 'DELETE',
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
    let slot_filler = e.target.closest(`.${CLASS_MODULE_SLOT}`);

    let empty_slot = create_ele_empty_module_slot(slot_filler.dataset.slot, slot_filler.dataset.parent);
    slot_filler.after(empty_slot);
    update_slot_status(e.target, data);

    slot_filler.remove();
    close_edit_mode(e.target);
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
    let re = QTY_RE;
    let qty_form = create_ele_slot_filler_edit_field(jobmod_id, filler_text, re);

    // Add the qty form and a cancel button in front of the display text span, then edit the display text to remove the qty
    desc_span.before(get_cancel_edit_btn());
    desc_span.before(create_ele_qty_and_submit(qty_form, desc_span.innerHTML, jobmod_id));
    desc_span.innerHTML = filler_text.replace(re, '');

    // Hide all the edit and remove buttons
    filler_div.classList.add(CSS_CLASS_EDIT_MODE_SLOT);
    desc_span.classList.add('hide');
    hide_all_by_class('edit-icon');
    hide_all_by_class(CLASS_REMOVE_SLOT_FILLER_BTN);
}


function create_ele_qty_and_submit(qty_ele, str, jobmod_id){
    let ele = document.createElement('span');
    ele.classList.add('combo-input-and-button');

    let span = document.createElement('span');
    let re = /^.+( x )/;

    let txt = document.createTextNode(str.trim().replace(re, ''));
    span.append(txt);

    span.append(get_slot_filler_remove_btn(jobmod_id));


    ele.append(span);
    ele.append(qty_ele);
    ele.append(get_qty_submit_btn());

    return ele;
}


// Edit mode: create a "form" for editting the qty
function create_ele_slot_filler_edit_field(jobmod_id, filler_text, re){
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
    let btn = create_generic_ele_submit_button();

    btn.id = ID_EDIT_FORM_SUBMIT_BUTTON;
    btn.addEventListener('click', (e) => {
        update_module_qty(e.target.previousSibling);
    });

    return btn;
}


// Edit Mode: Creates an X button for removing the JobItem from the slot
function get_slot_filler_remove_btn(jobmod_id){
    let btn = document.createElement('button');
    btn.classList.add('delete-panel');

    let span = document.createElement('span');
    span.innerHTML = 'unassign';
    btn.append(span);

    btn.setAttribute('data-jobmod', jobmod_id);
    btn.addEventListener('click', (e) => {
        remove_jobmodule(e);
    });
    return btn;
}

// Edit mode: button to cancel edit mode
function get_cancel_edit_btn(){
    let btn = create_generic_ele_cancel_button();

    btn.classList.add('close-edit-mode');
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

    let form_like_ele = filler_div.querySelector('.combo-input-and-button');
    form_like_ele.remove();

    let cancel_btn = filler_div.querySelector('.close-edit-mode');   
    cancel_btn.remove();

    let desc_span = filler_div.querySelector('.child-desc');
    desc_span.innerHTML = qty_txt + desc_span.innerHTML;
    if(desc_span.classList.contains('hide')){
        desc_span.classList.remove('hide');
    }

    if(filler_div.classList.contains(CSS_CLASS_EDIT_MODE_SLOT)){
        filler_div.classList.remove(CSS_CLASS_EDIT_MODE_SLOT);
    }

    unhide_all_by_class('edit-icon');
    remove_module_qty_errors();
}


// Edit Mode Action: called onclick of the submit button
function update_module_qty(qty_field){
    fetch(`${URL_ASSIGNMENTS}`, {
        method: 'PUT',
        body: JSON.stringify({
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
            display_module_qty_error(qty_field.nextElementSibling, data['max_qty']);
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

    if(data['message'] != 'No changes required.'){
        // Update the JobItem
        let jobitem_ele = ele.closest('.modular-item-container');
        update_excess_modules_css(jobitem_ele, data['jobitem_has_excess']);

        let subsection = ele.closest('.' + 'subsection');
        update_excess_modules_css(subsection, parseInt(data['slot_num_excess']) > 0);

        // Update the indicators in the "spine"
        let slot_ele = ele.closest('.' + CLASS_SLOT_ELEMENT);
        update_slot_status_indicator(slot_ele, 'required', data['required_str']);
        update_slot_status_indicator(slot_ele, 'optional', data['optional_str']);
        update_excess_slot_status_indicator(slot_ele, 'excess', data['slot_num_excess']);
    }

    return;
}

// Slot Status: toggle the "excess" CSS class on and off as needed
function update_excess_modules_css(element, has_excess){
    let has_excess_class = element.classList.contains(CLASS_EXCESS_MODULES);

    if(has_excess && !has_excess_class){
        element.classList.add(CLASS_EXCESS_MODULES);
    }
    else if(!has_excess && has_excess_class){
        element.classList.remove(CLASS_EXCESS_MODULES);
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








