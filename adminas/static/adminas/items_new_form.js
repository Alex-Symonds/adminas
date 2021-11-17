/*
    JavaScript for the JobItems form.
        > Add one new JobItem form, via a button on the last current item
        > Add N new JobItems via an input field at the top
        > Remove a JobItem
*/

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('#add_multi_items_btn').addEventListener('click', (e) => {
        e.preventDefault();
        add_multiple_items();
        return false;
    });

    document.querySelector('#add_item_btn').addEventListener('click', (e) => {
        e.preventDefault();
        add_single_item();
        return false;
    });

    document.querySelectorAll('.remove-item-btn').forEach(btn => {
        add_delete_event(btn);
    });

});

function add_delete_event(btn){
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        delete_this_form_row(e, 'form');
        return false;
    })
}

// Utils

// Add one item form
function clone_item_form(original_ele, prefix){
    let new_item = original_ele.cloneNode(true);
    console.log("cloning item form. Here's the new item:");
    console.log(new_item);
    // Update the Django form manager with the new total number of forms
    let num_forms = document.querySelector(`#id_${prefix}-TOTAL_FORMS`).value;
    num_forms++;
    document.querySelector(`#id_${prefix}-TOTAL_FORMS`).value = num_forms;

    // Make the new row an individual: give it its own IDs and wipe the copied inputs, if any
    update_form_row_ids(new_item, prefix, (num_forms - 1));
    wipe_data_from_form(new_item);
    
    // Add a delete event listener to the new delete button and the product dropdown; clear old auto_desc
    add_delete_event(new_item.querySelector('.remove-item-btn'));
    auto_item_desc_listener(new_item.querySelector('#id_form-' + (num_forms - 1) + '-product'));
    new_item.querySelector('.' + AUTO_DESC_CLASS).innerHTML = '';

    // Add new item to the DOM
    original_ele.after(new_item);
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


// Delete one item form
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

// Add multiple item forms to the set in one go
function add_multiple_items(){
    let num_to_add = document.querySelector('#add_multi_items').value;

    for(let i = 0; i < num_to_add; i++){
        add_single_item();
    }
    return false;
}

// Add one more item form to the set
function add_single_item(){
    clone_item_form(get_last_element('.form-row'), 'form');
    return false;
}