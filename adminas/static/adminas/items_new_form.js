/*
    JavaScript for the "add multiple JobItems" form.
        > Increase the number of JobItems to add by 1, via a button
        > Increase the number of JobItems to add by N, via an input field
        > Remove an individual "JobItem sub-form"
        > Close the entire form
*/

const CLASS_REMOVE_ITEM_FORM_BTN = 'remove-item-btn';
const CLASS_FORM_ROW = 'form-row';


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

    document.querySelectorAll('.' + CLASS_REMOVE_ITEM_FORM_BTN).forEach(btn => {
        add_delete_event(btn);
    });

});


// Support: add a delete eventlistener to a button. (Separate function so it can be applied to the buttons existing on-load AND cloned buttons)
function add_delete_event(btn){
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        delete_this_form_row(e, 'form');
        return false;
    })
}

// Add multiple JobItem forms to the set in one go
function add_multiple_items(){
    let num_to_add = document.querySelector('#add_multi_items').value;

    for(let i = 0; i < num_to_add; i++){
        add_single_item();
    }
    return false;
}

// Add one more JobItem form to the set
function add_single_item(){
    clone_item_form(get_last_element('.' + CLASS_FORM_ROW), 'form');
    return false;
}


// Add one more JobItem form to the main form
function clone_item_form(original_ele, prefix){
    let new_item = original_ele.cloneNode(true);

    // Update the Django form manager with the new total number of forms
    let num_forms = parseInt(document.querySelector(`#id_${prefix}-TOTAL_FORMS`).value);
    document.querySelector(`#id_${prefix}-TOTAL_FORMS`).value = num_forms + 1;

    // Make the new row an individual: give it its own IDs and wipe the copied inputs, if any
    update_form_row_ids(new_item, prefix, num_forms);
    wipe_data_from_form(new_item);
    
    // Add a delete event listener to the new delete button and the product dropdown; clear old auto_desc
    add_delete_event(new_item.querySelector('.' + CLASS_REMOVE_ITEM_FORM_BTN));
    auto_item_desc_listener(new_item.querySelector('#id_form-' + num_forms + '-product'));
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


// Delete one JobItem form
function delete_this_form_row(e, prefix){   

    // If there's more than one form row, delete the chosen form row
    let all_items = document.querySelectorAll('.' + CLASS_FORM_ROW);
    if (all_items.length > 1){
        // Delete the row and update the Django form manager accordingly
        e.target.closest('.' + CLASS_FORM_ROW).remove();
        document.querySelector(`#id_${prefix}-TOTAL_FORMS`).value = all_items.length - 1;

        // Grab all the remaining forms and re-number them to fill any gaps
        let remaining_items = document.querySelectorAll('.' + CLASS_FORM_ROW);
        for (var i = 0; i < remaining_items.length; i++){
            update_form_row_ids(remaining_items[i], prefix, i);
        }
    } else {
        // If this is the last item, we're not deleting it because then there'd be nothing to clone next time.
        // Reset the form instead, as a sort of compromise.
        document.querySelector('#items_form').reset();
    } 
    return false;
}

