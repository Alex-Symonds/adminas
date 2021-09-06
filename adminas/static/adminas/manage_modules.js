EMPTY_MODULE_SLOT_CLASS = 'empty-module-slot';
BUCKET_MENU_CLASS = 'module-bucket-container';
ADD_SLOT_CLASS = 'add-slot';
CLASS_EDIT_SLOT_FILLER_BTN = 'edit-slot-filler-btn';
CLASS_REMOVE_SLOT_FILLER_BTN = 'remove-from-slot-btn';
CLASS_TEMP_ERROR_MSG = 'temp-warning-msg';

// Add event handlers to elements created by Django
document.addEventListener('DOMContentLoaded', (e) =>{
    document.querySelectorAll('.' + EMPTY_MODULE_SLOT_CLASS).forEach(div => {
        div.addEventListener('click', (e) =>{
            open_module_bucket_of_options(e);
        })
    });

    document.querySelectorAll('.' + ADD_SLOT_CLASS).forEach(div =>{
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
function add_empty_slot(e){
    console.log("TODO. My job is to check how many slots exist already, then add another slot to this section if there's space.");
    // Remember you already have "create_empty_slot(slot, parent)"
}














// -------------------------------------------------------------------------------
// Opening the bucket of options
// -------------------------------------------------------------------------------

// Called onClick of an empty slot: opens a "bucket menu" of elligible JobItems and an "add new item" button
async function open_module_bucket_of_options(e){
    let empty_slot_div = get_empty_slot_div(e.target);
    let bucket_div = await create_module_bucket_div(empty_slot_div.dataset.slot, empty_slot_div.dataset.parent);
    empty_slot_div.after(bucket_div);
}

// Bucket menu: close the bucket window
function close_module_bucket_of_options(){
    document.querySelector('.' + BUCKET_MENU_CLASS).remove();
}

// Bucket menu: find the div for the "empty slot", regardless of whether what you just clicked counts as that div or a child
function get_empty_slot_div(target){
    if(target.classList.contains(EMPTY_MODULE_SLOT_CLASS)){
        return target;
    } else {
        return target.closest('.' + EMPTY_MODULE_SLOT_CLASS);
    }
}

// Bucket menu: create a div element for the bucket menu and fill it with stuff created by other functions
async function create_module_bucket_div(slot_id, parent_id){
    let div = document.createElement('div');
    div.classList.add(BUCKET_MENU_CLASS);
    
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
function fill_slot_with_new_jobitem_form(e){
    console.log('TODO. My job is to display a form for adding a new item.');
}












// ------------------------------------------------------------------------
// Assigning a JobItem to a module
// ------------------------------------------------------------------------
// Called onClick of one of the existing JobItems in the bucket menu
async function assign_jobitem_to_slot(e){
    let jobmod_id = await create_jobmodule_on_server(e.target.dataset.child, e.target.dataset.parent, e.target.dataset.slot);
    let description = e.target.innerHTML;
    let bucket_div = e.target.closest('.' + BUCKET_MENU_CLASS);
    let slot_contents_div = bucket_div.parentElement;
    let empty_slot = slot_contents_div.querySelector('.' + EMPTY_MODULE_SLOT_CLASS);

    let filled_slot = create_slot_filler_read(description, 1, e.target.dataset.slot, e.target.dataset.parent, jobmod_id);

    slot_contents_div.append(filled_slot);
    empty_slot.remove();
    bucket_div.remove();
}

// Assignments: Asks the server for the max_qty, for use in form validation
// Note: is this still needed?
async function get_max_qty(child_id, parent_id, slot_id){
    let response = await fetch(`${URL_ASSIGNMENTS}?return=max_quantity&child=${child_id}&parent=${parent_id}&slot=${slot_id}`)
    .catch(error => {
        console.log('Error: ', error);
    });

    let resp = await response.json();
    let data = resp['data'];
    return max_qty = parseInt(data[0]['max_qty']);
}

// Assignments: Send data about the selected JobModule to the server to store the relationship there
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
    return resp_json['id'];
}


// Assignments: Create a div to "fill the slot" with the selected JobItem
function create_slot_filler_read(description, quantity, slot_id, parent_id, jobmod_id){
    let div = document.createElement('div');
    div.classList.add('full-module-slot');
    div.classList.add('jobitem');

    div.setAttribute('data-slot', slot_id);
    div.setAttribute('data-parent', parent_id);

    div.append(get_slot_filler_desc_span(description, quantity));
    div.append(get_slot_filler_edit_btn(jobmod_id));
    div.append(get_slot_filler_remove_btn(jobmod_id));
    return div;
}

// Assignments: RegEx to isolate $N from "$N x [ABC123456] Thingummy Jigger"
function get_qty_re(){
    return re = /^\d+(?=( x ))/g;
}

// Assignments: Creates a span containing "$N x [ABC123456] Thingummy Jigger", where $N is replaced by the second arg to the function
function get_slot_filler_desc_span(description, quantity){
    let re = get_qty_re();
    let span = document.createElement('span');
    span.classList.add('child-desc');
    span.innerHTML = description.replace(re, quantity); 
    return span;
}

// Assignments: Create an edit button for a filled slot
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

// Assignments: Creates an X button for removing the JobItem from the slot
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
// Un-assignments
// ------------------------------------------------------------------------
// Called onClick by the [x] button on filled slots. Manages removing a JobItem from a slot
function remove_jobmodule(e){
    unfill_slot_on_server(e);
    unfill_slot_on_page(e);
}

// Backend removal of the JobItem from the slot
function unfill_slot_on_server(e){
    fetch(`${URL_ASSIGNMENTS}`, {
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
}

// Frontend removal of the JobItem from the slot
function unfill_slot_on_page(e){
    let slot_filler = e.target.parentElement;
    let empty_slot = create_empty_slot_div(slot_filler.dataset.slot, slot_filler.dataset.parent);
    slot_filler.after(empty_slot);
    slot_filler.remove();
}

// Create an empty slot div (mimicking the ones Django makes on initial page load)
function create_empty_slot_div(slot_id, parent_id){
    let div = document.createElement('div');
    div.classList.add(EMPTY_MODULE_SLOT_CLASS);

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














// -----------------------------------------------------------------------------
// Edit mode for filled slots
// -----------------------------------------------------------------------------
// Called onClick of the [edit] button on a filled slot
function edit_mode_slot_filler_qty(e){
    // Find the "main" slot div and the span with the display text
    let filler_div = e.target.closest('.full-module-slot');
    let desc_span = filler_div.querySelector('.child-desc');

    // Prep values, then call a function to generate a suitable edit-mode form
    let jobmod_id = e.target.dataset.jobmod;
    let filler_text = desc_span.innerHTML;
    let re = get_qty_re();
    let qty_form = get_slot_filler_edit_form(jobmod_id, filler_text, re);

    // Add the qty form and a cancel button in front of the display text span, then edit the display text to remove the qty
    desc_span.before(qty_form);
    desc_span.before(get_qty_submit_btn()); // This uses "previousSibling" to access qty_form
    desc_span.before(get_cancel_edit_btn());
    desc_span.innerHTML = filler_text.replace(re, '');

    // Hide all the edit and remove buttons
    hide_all_by_class(CLASS_EDIT_SLOT_FILLER_BTN);
    hide_all_by_class(CLASS_REMOVE_SLOT_FILLER_BTN);
}

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



// Edit mode: form for editting the qty, complete with submit button and exciting hidden inputs
function get_slot_filler_edit_form(jobmod_id, filler_text, re){
    let fld = document.createElement('input');
    fld.value = filler_text.match(re);
    fld.type = 'number';
    fld.name = 'qty';
    fld.id = 'id_qty';
    fld.required = true;
    fld.min = 1;

    fld.setAttribute('data-id', jobmod_id);
    fld.setAttribute('data-prev_qty', filler_text.match(re));

    fld.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            update_module_qty(e.target);
        }
    });

    return fld;
}
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

// Edit mode: exit edit mode on the page without troubling the server
function close_edit_mode(ele, new_qty){
    // Find the parent filler div, then work from there
    let filler_div = ele.closest('.full-module-slot');

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







// Edit action: Perform the update
function update_module_qty(qty_field){
    //update_module_qty_on_server(qty_field);
    //update_module_qty_on_page(qty_field);
//}

//function update_module_qty_on_server(qty_field){
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
            update_module_qty_on_page(qty_field);
        } else {
            display_module_qty_error(qty_field, data['max_qty']);
        }
    })
    .catch(error => {
        console.log('Error: ', error)
    });
}


function update_module_qty_on_page(qty_field){
    if(qty_field.value === '' || parseFloat(qty_field.value) <= 0){
        close_edit_mode(qty_field);
        return;
    }
    close_edit_mode(qty_field, qty_field.value);
}



function display_module_qty_error(qty_field, max_qty_str){
    let error_msg = document.createElement('div');
    error_msg.classList.add(CLASS_TEMP_ERROR_MSG);
    error_msg.innerHTML = `Not enough items (${max_qty_str} remaining)`;
    qty_field.after(error_msg);
}

function remove_module_qty_errors(){
    document.querySelectorAll('.' + CLASS_TEMP_ERROR_MSG).forEach(div => {
        div.remove();
    });
}


