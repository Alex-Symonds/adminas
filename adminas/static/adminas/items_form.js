/*
    JavaScript for the JobItems form.
        > Add one new JobItem form, via a button on the last current item
        > Add N new JobItems via an input field at the top
        > Remove a JobItem
*/

// Event listeners
document.addEventListener('DOMContentLoaded', function(e){
    document.querySelector('#add_multi_items_btn').addEventListener('click', function(e) {
        e.preventDefault();
        add_multiple_items(e);
        return false;
    });
    document.querySelector('#add_item_btn').addEventListener('click', function(e) {
        e.preventDefault();
        add_single_item(e);
        return false;
    });
    document.querySelectorAll('.remove-item-btn').forEach(btn => {
        add_delete_event(btn);
    });
});

function add_delete_event(btn){
    btn.addEventListener('click', function(e){
        e.preventDefault();
        delete_this_form_row(e, 'form');
        return false;
    })
}

// Utils

// Add one item form
function clone_item_form(original, prefix){
    let new_item = original.cloneNode(true);
    
    // Update the Django form manager with the new total number of forms
    let num_forms = document.querySelector(`#id_${prefix}-TOTAL_FORMS`).value;
    num_forms++;
    document.querySelector(`#id_${prefix}-TOTAL_FORMS`).value = num_forms;

    // Make the new row an individual: give it its own IDs and wipe the copied inputs, if any
    update_form_row_ids(new_item, prefix, (num_forms - 1));
    wipe_cloned_data(new_item);
    
    // Move the add button to the bottom element. (Moving preserves the event listener)
    let add_btn_selector = '#add_item_btn';
    new_item.removeChild(new_item.querySelector(add_btn_selector));
    add_btn = document.querySelector(add_btn_selector);
    new_item.appendChild(add_btn);

    // Add a delete event listener to the new delete button
    add_delete_event(new_item.querySelector('.remove-item-btn'));

    // Add new item to the DOM
    original.after(new_item);
}

// Wipe data from cloned form row
function wipe_cloned_data(form_row){
    let targets = form_row.children;
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


// Update attributes with a new ID number
function update_form_row_ids(row_ele, prefix, new_id){
    var re = new RegExp(prefix + '-\\d+-');
    var new_str = `${prefix}-${new_id}-`;

    let children = row_ele.children;
    for(var i=0; i < children.length; i++){
        if (children[i].hasAttribute('for')){
            children[i].htmlFor = children[i].htmlFor.replace(re, new_str);
        }
        if (children[i].hasAttribute('id')){
            children[i].id = children[i].id.replace(re, new_str);
        }
        if (children[i].hasAttribute('name')){
            children[i].name = children[i].name.replace(re, new_str);
        }
    }
    return false;
}

// Find the last element of a type
function get_last_element(selector){
    let elements = document.querySelectorAll(selector);
    let arr_id = elements.length - 1;
    return elements[arr_id];
}

// Delete one item form without messing up everything else
function delete_this_form_row(e, prefix){   

    // If there's more than one form row, delete the chosen form row
    let all_items = document.querySelectorAll('.form-row');
    if (all_items.length > 1){
        // Check if the deleted form row is the one with the add button. If so, attach that to the item above
        let delete_children = e.target.children;
        for (let c = 0; c < delete_children.length; c++){
            if (delete_children[c].id = 'add_item_btn'){
                let t_row = get_last_element('.form-row');
                t_row.appendChild(delete_children[c]);
                break;
            }
        }

        // Delete the row and update the Django form manager accordingly
        e.target.closest('.form-row').remove();
        document.querySelector(`#id_${prefix}-TOTAL_FORMS`).value = all_items.length - 1;

        // Grab all the remaining forms and re-number them to fill any gaps
        let remaining_items = document.querySelectorAll('.form-row');
        for (var i = 0; i < remaining_items.length; i++){
            update_form_row_ids(remaining_items[i], prefix, i);
        }
    } else {
        // If this is the last item, reset the form (as a sort of compromise)
        document.querySelector('#items_form').reset();
    } 
    return false;
}

// Add more than one item form in one go
function add_multiple_items(e){
    num_to_add = document.querySelector('#add_multi_items').value;

    for(let i = 0; i < num_to_add; i++){
        add_single_item(e);
    }
    return false;
}

// Add an item form
function add_single_item(e){
    clone_item_form(get_last_element('.form-row'), 'form');
    return false;
}