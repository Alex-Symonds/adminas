EMPTY_MODULE_SLOT_CLASS = 'empty-module-slot';
BUCKET_MENU_CLASS = 'module-bucket-container';

document.addEventListener('DOMContentLoaded', (e) =>{
    document.querySelectorAll('.' + EMPTY_MODULE_SLOT_CLASS).forEach(div => {
        div.addEventListener('click', (e) =>{
            open_module_bucket_of_options(e);
        })
    });
});

async function open_module_bucket_of_options(e){
    let empty_slot_div = get_empty_slot_div(e.target);
    let bucket_div = await create_module_bucket_div(empty_slot_div.dataset.slot, empty_slot_div.dataset.parent);
    empty_slot_div.after(bucket_div);
}

function close_module_bucket_of_options(){
    document.querySelector('.' + BUCKET_MENU_CLASS).remove();
}

function get_empty_slot_div(target){
    if(target.classList.contains(EMPTY_MODULE_SLOT_CLASS)){
        return target;
    } else {
        return target.closest('.' + EMPTY_MODULE_SLOT_CLASS);
    }
}

async function create_module_bucket_div(slot_id, parent_id){
    let div = document.createElement('div');
    div.classList.add(BUCKET_MENU_CLASS);

    div = await append_existing_jobitems(div, slot_id, parent_id);
    div = append_new_jobitem_button(div, slot_id, parent_id);
    div = append_cancel_button(div);

    return div;
}

async function append_existing_jobitems(div, slot_id, parent_id){
    let json_response = await get_list_for_module_slot(slot_id, parent_id, 'jobitems');
    let existing_ji = json_response['data'];

    if(typeof existing_ji === 'undefined'){
        let p = document.createElement('p');
        p.innerHTML = 'There are no unassigned items on this job which are suitable for this slot.';
        div.append(p);
    }
    else {
        for(var i=0; i < existing_ji.length; i++){
            var ji_option_div = create_module_option_div(slot_id, parent_id, existing_ji[i]);
            div.append(ji_option_div);
        }
    }
    return div;
}

async function get_list_for_module_slot(slot_id, parent_id, list_type){
    let response = await fetch(`${URL_ASSIGNMENTS}?parent=${parent_id}&slot=${slot_id}&return=${list_type}`)
    .catch(error => {
        console.log('Error: ', error);
    });

    return await response.json();
}

function create_module_option_div(slot, parent, data){
    var ji_option_div = document.createElement('div');

    ji_option_div.setAttribute('data-slot', slot);
    ji_option_div.setAttribute('data-parent', parent);
    ji_option_div.setAttribute('data-child', data['id']);

    ji_option_div.innerHTML = `${data['quantity']} x ${data['name']}`;

    ji_option_div.addEventListener('click', (e) =>{
        assign_jobitem_to_slot(e);
    });

    return ji_option_div;
}

function append_new_jobitem_button(div, slot_id, parent_id){
    let btn = document.createElement('button');
    btn.innerHTML = 'add new item to order';
    btn.setAttribute('data-slot', slot_id);
    btn.setAttribute('data-parent', parent_id);
    btn.addEventListener('click', (e) => {
        fill_slot_with_new_jobitem_form(e);
    });

    div.append(btn);
    return div;
}

function append_cancel_button(div){
    let btn = document.createElement('button');
    btn.innerHTML = 'cancel';
    btn.addEventListener('click', (e) => {
        close_module_bucket_of_options();
    });
    div.append(btn);
    return div;
}


function assign_jobitem_to_slot(e){



    console.log(`TODO. My job is to tell the server to create/edit a JobModule where: child = ${e.target.dataset.child}, parent = ${e.target.dataset.parent}, slot = ${e.target.dataset.slot}`);
}

function fill_slot_with_new_jobitem_form(e){
    console.log('TODO. My job is to display a form for adding a new item.');
}