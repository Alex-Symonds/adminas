/*
    Document Builder page's item assignment functionality.
    (Main document functions and special instructions are in a separate file.)

    Covers:
        > The split button/s
        > The incl. and excl. buttons
*/


const ID_INCLUDES_UL = 'included';
const ID_EXCLUDES_UL = 'excluded';
const CLASS_SPLIT_PREVIEW_INCLUDES = 'included';
const CLASS_SPLIT_PREVIEW_EXCLUDES = 'excluded';

const CLASS_NONE_LI = 'none';
const CLASS_SPLIT_BTN = 'split-docitem-btn';
const CLASS_TOGGLE_BTN = 'toggle-docitem-btn';
const CLASS_DISPLAY_SPAN = 'display';

const CLASS_SPLIT_WINDOW = 'split-docitem-window';
const CLASS_SPLIT_DIRECTION_SETTER = 'split-direction-setter';
const CLASS_SPLIT_DIRECTION_STRIP = 'split-direction-strip';
const CLASS_SPLIT_STATUS_CONTAINER = 'docitem-split-status-container';
const ID_SPLIT_WINDOW_INCLUDES_ARROWS = 'id_split_includes_arrows';
const ID_SPLIT_WINDOW_EXCLUDES_ARROWS = 'id_split_excludes_arrows';
const ID_SPLIT_WINDOW_DIRECTION = 'id_split_controls';

const STR_INCLUDES_BTN = '&laquo; incl.';
const STR_EXCLUDES_BTN = 'excl. &raquo;';
const STR_SPLIT_BTN = '&laquo; split &raquo;';


// Add the event listeners to the split and incl/excl buttons
document.addEventListener('DOMContentLoaded', () => {

    document.querySelectorAll('.' + CLASS_TOGGLE_BTN).forEach(btn => {
        btn.addEventListener('click', (e) => {
            toggle_doc_item(e);
        })
    });

    document.querySelectorAll('.' + CLASS_SPLIT_BTN).forEach(btn => {
        btn.addEventListener('click', (e) => {
            split_doc_item(e);
        })
    });

});





// -------------------------------------------------------------------
// Toggling doc items between "on this doc" and "not on this doc"
// -------------------------------------------------------------------

// Toggle docitems: main function, called on click of any incl. or excl. button
function toggle_doc_item(e){
    const docitem_ele = e.target.closest('li');
    const src_ul = docitem_ele.parentElement;
    const dst_ul = get_dest_docitem_ul(src_ul);
    if(dst_ul == null){
        return;
    }
    update_both_docitem_ul_for_toggle(dst_ul, src_ul, docitem_ele);
    show_save_warning_ele();
    return;
}

// Toggle docitems: manage moving the <li> and, if necessary, updating the message of intentional emptiness.
function update_both_docitem_ul_for_toggle(dst_ul, src_ul, docitem_ele){
    move_docitem_li(dst_ul, docitem_ele);
    update_none_li(src_ul, dst_ul);
}

// Toggle docitems: select the destination ul, based on the source ul
function get_dest_docitem_ul(src_ul){   
    if(src_ul.id === ID_INCLUDES_UL){
        var dst_ul = document.querySelector('#' + ID_EXCLUDES_UL);
        
    } else if (src_ul.id === ID_EXCLUDES_UL){
        var dst_ul = document.querySelector('#' + ID_INCLUDES_UL);

    } else {
        return null;
    }
    return dst_ul;
}




// Toggle docitems: update the position/content of the docitem li
function move_docitem_li(dst_ul, src_li){
    // If there's already a li for this item in the destination ul (following a split), 
    // the "move" will consist of updating the quantity displayed in the destination li 
    // and deleting the source li.
    const dst_li = get_li_with_same_jiid(dst_ul, src_li.dataset.jiid);
    if(dst_li != null){
        merge_into_dst_docitem_li(src_li, dst_li);

    // Otherwise, actually move the source <li> to the destination <ul>
    // (Remember to update the display text on the incl/excl button.)
    } else {
        toggle_btn_str = get_toggle_display_str(dst_ul);
        src_li.querySelector('.' + CLASS_TOGGLE_BTN).innerHTML = toggle_btn_str;
        dst_ul.append(src_li);
    }
    return;
}

// Toggle docitems: "reverse" the display text on the incl/excl buttons.
function get_toggle_display_str(dst_ul){
    let display_str = 'toggle';

    if(dst_ul.id === ID_EXCLUDES_UL){
        display_str = STR_INCLUDES_BTN;
    }
    else if(dst_ul.id === ID_INCLUDES_UL){
        display_str = STR_EXCLUDES_BTN;
    }

    return display_str;
}



// Toggle docitems: handle the message of intentional emptiness
function update_none_li(src_ul, dst_ul){
    // An otherwise empty ul should show one li for "None".
    // Add it to src if src is now empty; remove it from dst if dst is no longer empty.
    remove_none_li(dst_ul);
    if(!ul_contains_li(src_ul)){
        src_ul.append(get_none_li());
    }
}

// Toggle docitems: remove a message of intentional emptiness
function remove_none_li(ul_ele){
    const none_li = ul_ele.querySelector('.' + CLASS_NONE_LI);
    if(none_li != null){
        none_li.remove();
    }  
}

// Toggle docitems: check if the ul has any li elements inside
function ul_contains_li(ul_ele){
    for(i = 0; i < ul_ele.children.length; i++){
        if(ul_ele.children[i].nodeName == 'LI'){
            return true;
        }
    }
    return false;
}

// Toggle docitems: create a message of intentional emptiness
function get_none_li(){
    const li = document.createElement('li');
    li.classList.add(CLASS_NONE_LI);
    li.append(document.createTextNode('None'));
    return li;
}

// Toggle docitems: if there is a li with a particular JobItem ID inside a ul, return it
function get_li_with_same_jiid(target_ul, jiid){
    for(i = 0; i < target_ul.children.length; i++){
        if(target_ul.children[i].dataset.jiid){
            if(jiid == target_ul.children[i].dataset.jiid){
                return target_ul.children[i];
            }
        }
    }
    return null;
}

// Toggle docitems: if the toggled JobItem was previously split between included and excluded, re-combine it.
function merge_into_dst_docitem_li(src_li, dst_li){
    const dst_span = dst_li.querySelector('.' + CLASS_DISPLAY_SPAN);
    const src_span = src_li.querySelector('.' + CLASS_DISPLAY_SPAN);
    dst_span.innerHTML = get_combined_docitem_text(src_span.innerHTML, dst_span.innerHTML);
    src_li.remove();
    return;
}

// Toggle docitems: combine a "1 x Item" string and a "3 x Item" string into a "4 x Item" string
function get_combined_docitem_text(src_text, dst_text){
    let qty_src = parseInt(src_text.match(QTY_RE)[0]);
    let qty_dst = parseInt(dst_text.match(QTY_RE)[0]);
    let qty_sum = qty_src + qty_dst;
    return dst_text.replace(QTY_RE, qty_sum);
}
















// ---------------------------------------------------------
// Split docitems
// ---------------------------------------------------------

// Split DocItem: main function called by clicking a "<< split >>"" button
function split_doc_item(e){
    open_docitem_split_window(e.target);
}

// Split DocItem: Create and place a window to set how to split the docitem
function open_docitem_split_window(split_btn){
    close_docitem_split_window();

    const li_ele = split_btn.closest('li');
    const calling_ul_id = li_ele.parentElement.id;
    li_ele.append(create_ele_docitem_split_window(li_ele.dataset.jiid, calling_ul_id));
    hide_all_by_class(CLASS_SPLIT_BTN);
    hide_all_by_class(CLASS_TOGGLE_BTN);
}

// Split DocItem Panel: Create the panel
function create_ele_docitem_split_window(jobitem_id, calling_ul_id){
    let div = document.createElement('div');
    div.classList.add(CLASS_SPLIT_WINDOW);
    div.classList.add(CSS_GENERIC_FORM_LIKE);
    div.classList.add(CSS_GENERIC_PANEL);

    div.append(create_ele_docitem_split_heading());
    div.append(create_ele_docitem_desc(jobitem_id));
    div.append(create_ele_docitem_split_controls(jobitem_id, calling_ul_id));
    div.append(create_ele_docitem_split_status_container(jobitem_id));
    div.append(create_ele_docitem_split_submit_btn());
    
    return div;
}

// Split DocItem Panel: component, heading
function create_ele_docitem_split_heading(){
    let ele = document.createElement('div');
    ele.classList.add(CSS_GENERIC_PANEL_HEADING);
    let heading = document.createElement('h5');
    heading.innerHTML = 'Edit Split';
    ele.append(create_ele_docitem_split_cancel_btn());
    ele.append(heading);
    return ele;
}

// Split DocItem Panel: component, intro paragraph
function create_ele_docitem_desc(jobitem_id){
    let desc = document.createElement('p');
    desc.innerHTML = 'Splitting ' + get_combined_docitem_text_from_jobitem_id(jobitem_id);
    return desc;
}

// Split DocItem Panel: component, get the text describing the docitem and its total quantity
function get_combined_docitem_text_from_jobitem_id(jobitem_id){
    let inc_text = get_individual_docitem_text_from_jobitem_id(ID_INCLUDES_UL, jobitem_id);
    let exc_text = get_individual_docitem_text_from_jobitem_id(ID_EXCLUDES_UL, jobitem_id);

    if(inc_text == ''){
        return exc_text;
    } else if(exc_text == ''){
        return inc_text;
    } else {
        return get_combined_docitem_text(inc_text, exc_text);
    }
}

// Split DocItem Panel: component, get the item display text from one <li>
function get_individual_docitem_text_from_jobitem_id(ul_id, jobitem_id){
    let ul = document.querySelector('#' + ul_id);
    let li = get_li_with_same_jiid(ul, jobitem_id);
    if(li != null){
        return li.querySelector('.' + CLASS_DISPLAY_SPAN).innerHTML;
    } else {
        return '';
    } 
}



// Split DocItem Panel: component, the bit where you actually click and input things
function create_ele_docitem_split_controls(jobitem_id, calling_ul_id){
    const div = document.createElement('div');
    div.classList.add(CLASS_SPLIT_DIRECTION_SETTER);
    div.append(create_ele_docitem_split_direction_div(calling_ul_id));

    let default_qty = get_docitem_qty(calling_ul_id, jobitem_id);
    const input_fld = create_ele_docitem_edit_field(default_qty);
    div.append(input_fld);

    return div;
}

// Split DocItem Panel: component, the strip where you can set whether the number you input is for included or excluded
function create_ele_docitem_split_direction_div(called_from){
    const direction_div = document.createElement('div');
    direction_div.classList.add(CLASS_SPLIT_DIRECTION_STRIP);

    const includes_div = document.createElement('div');
    const excludes_div = document.createElement('div');

    includes_div.id = ID_SPLIT_WINDOW_INCLUDES_ARROWS;
    excludes_div.id = ID_SPLIT_WINDOW_EXCLUDES_ARROWS;

    if(called_from === ID_INCLUDES_UL){
        includes_div.innerHTML = '&laquo;&laquo;&laquo;';
        excludes_div.innerHTML = '';
        var middle_display_str = CLASS_SPLIT_PREVIEW_INCLUDES;
    }
    else if(called_from === ID_EXCLUDES_UL){
        includes_div.innerHTML = '';
        excludes_div.innerHTML = '&raquo;&raquo;&raquo;';
        var middle_display_str = CLASS_SPLIT_PREVIEW_EXCLUDES;
    }

    direction_div.append(includes_div);

    const middle_div = document.createElement('div');
    middle_div.id = ID_SPLIT_WINDOW_DIRECTION;
    middle_div.innerHTML = middle_display_str;
    middle_div.addEventListener('click', (e) => {
        toggle_docitem_split_controls(e);
    });
    direction_div.append(middle_div);

    direction_div.append(excludes_div);
    return direction_div;
}

// Split DocItem Panel: component, the input where you enter the quantity you want
function create_ele_docitem_edit_field(){
    let fld = get_jobitem_qty_field();

    fld.addEventListener('change', (e) => {
        update_split_window(e.target);
    });

    fld.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            update_split_window(e.target);
            process_split_request(e.target);
        }
    });

    return fld;
}



// Split DocItem Panel: component, the bit that previews the outcome of your split input
function create_ele_docitem_split_status_container(jobitem_id){
    let container = document.createElement('div');
    container.classList.add(CLASS_SPLIT_STATUS_CONTAINER);
    container.append(create_ele_docitem_split_category_div(CLASS_SPLIT_PREVIEW_INCLUDES, jobitem_id));
    container.append(create_ele_docitem_split_category_div(CLASS_SPLIT_PREVIEW_EXCLUDES, jobitem_id));
    return container;
}

// Split DocItem Panel: component, one "side" of the results preview
function create_ele_docitem_split_category_div(class_name, jobitem_id){
    const div = document.createElement('div');
    div.classList.add(class_name);
    div.classList.add('container');

    const heading = document.createElement('h5');
    heading.innerHTML = class_name[0].toUpperCase() + class_name.substring(1);
    div.append(heading);

    let default_qty = get_docitem_qty(class_name, jobitem_id);
    let result_span = document.createElement('span');
    result_span.innerHTML = default_qty;
    div.append(result_span);

    return div;
}


// Split DocItem Panel: component, the submit button
function create_ele_docitem_split_submit_btn(){
    let btn = create_generic_ele_submit_button();
    btn.classList.add('full-width-button');
    btn.innerHTML = 'split';
    btn.addEventListener('click', (e) => {
        process_split_request(e.target);
    });
    return btn;
}

// Split DocItem Panel: component, the cancel button
function create_ele_docitem_split_cancel_btn(){
    let btn = create_generic_ele_cancel_button();
    btn.addEventListener('click', () => {
        close_docitem_split_window();
    });
    return btn;
}

// Split DocItem: function to reset the frontend when the split window is closed
function close_docitem_split_window(){
    let existing_window = document.querySelector('.' + CLASS_SPLIT_WINDOW);
    if(existing_window){
        existing_window.remove();
    }
    unhide_all_by_class(CLASS_SPLIT_BTN);
    unhide_all_by_class(CLASS_TOGGLE_BTN);
}


// Split DocItem Window: function, called by clicking the "__cludes" strip: flips the text to indicate if the input number is for included or excluded
function toggle_docitem_split_controls(e){
    let original_id = e.target.innerHTML;
    let includes_div = document.querySelector('#' + ID_SPLIT_WINDOW_INCLUDES_ARROWS);
    let excludes_div = document.querySelector('#' + ID_SPLIT_WINDOW_EXCLUDES_ARROWS);
    let direction_div = document.querySelector('#' + ID_SPLIT_WINDOW_DIRECTION);

    if(original_id === ID_INCLUDES_UL){
        includes_div.innerHTML = '';
        excludes_div.innerHTML = '&raquo;&raquo;&raquo;';
        direction_div.innerHTML = ID_EXCLUDES_UL;

    } else if (original_id === ID_EXCLUDES_UL){
        includes_div.innerHTML = '&laquo;&laquo;&laquo;';
        excludes_div.innerHTML = '';
        direction_div.innerHTML = ID_INCLUDES_UL;
    }
}


// Split DocItem Window: function, called by entering a number in the input. Updates the status section accordingly
function update_split_window(input_fld){
    let controls_state = get_docitem_split_controls_state();

    let selected_class = controls_state;
    let other_class = toggle_docitem_membership_id(controls_state);

    let selected_ele = get_docitem_split_window_result_ele(selected_class);
    let other_ele = get_docitem_split_window_result_ele(other_class);
    let selected_qty = parseInt(input_fld.value);
    let total_qty = get_total_qty(input_fld.closest('li').dataset.jiid);
    set_docitem_split_window(selected_ele, other_ele, total_qty, selected_qty);
}

// Split DocItem Window: function, flips the __cludes class to the other
function toggle_docitem_membership_id(in_id){
    if(in_id == CLASS_SPLIT_PREVIEW_INCLUDES){
        return CLASS_SPLIT_PREVIEW_EXCLUDES;
    }
    return CLASS_SPLIT_PREVIEW_INCLUDES;
}

// Split DocItem Window: function, checks the current status of the "direction" slip and returns the class
function get_docitem_split_controls_state(){
    let split_controls_ele = document.querySelector('#' + ID_SPLIT_WINDOW_DIRECTION);
    let display_text = split_controls_ele.innerHTML.toLowerCase();

    if(display_text.includes(CLASS_SPLIT_PREVIEW_EXCLUDES)){
        return CLASS_SPLIT_PREVIEW_EXCLUDES;
    }
    else if(display_text.includes(CLASS_SPLIT_PREVIEW_INCLUDES)){
        return CLASS_SPLIT_PREVIEW_INCLUDES;
    }
    return
}

// Split DocItem Window: function, updates the two "result preview" values
function set_docitem_split_window(selected_ele, other_ele, total_qty, selected_qty){
    if(selected_qty <= 0){
        selected_ele.innerHTML = 0;
        other_ele.innerHTML = total_qty;
    }
    else if(selected_qty <= total_qty){
        selected_ele.innerHTML = selected_qty;
        other_ele.innerHTML = total_qty - selected_qty;
    }
    else if(selected_qty > total_qty){
        selected_ele.innerHTML = total_qty;
        other_ele.innerHTML = 0;        
    }
}

// Split DocItem Window: function, checks both <ul>s for <li>s for this JobItem, extracts the quantity/ies and sums them
function get_total_qty(jiid){
    let result = 0;

    let includes_qty = get_docitem_qty(ID_INCLUDES_UL, jiid);
    result += includes_qty;

    let excludes_qty = get_docitem_qty(ID_EXCLUDES_UL, jiid);
    result += excludes_qty;

    return result;
}

// Split DocItem Window: function, find the quantity expressed in a JobItem <li> based on the UL ID and the JobItem ID
function get_docitem_qty(class_name, jiid){
    let ul = document.querySelector('#' + class_name);
    const docitem_ele = get_li_with_same_jiid(ul, jiid);
    return get_docitem_qty_from_li(docitem_ele);
}

// Split DocItem Window: function, find the quantity expressed in a JobItem <li> based on the <li> element
function get_docitem_qty_from_li(docitem_ele){
    if(docitem_ele != null){
        return parseInt(docitem_ele.querySelector('.' + CLASS_DISPLAY_SPAN).innerHTML.match(QTY_RE)[0])
    }
    return 0;
}








// Split DocItem Activity: main function to call to make the split happen
function process_split_request(calling_ele){
    // Update the split window, just in case the user didn't trigger an update
    update_split_window(document.querySelector('#id_qty'));

    // Get the JobItem ID and the new incl and excl quantities
    const docitem_li = calling_ele.closest('li');
    const jobitem_id = docitem_li.dataset.jiid;

    let window_result_span = get_docitem_split_window_result_ele(CLASS_SPLIT_PREVIEW_INCLUDES);
    const incl_value = parseInt(window_result_span.innerHTML);

    window_result_span = get_docitem_split_window_result_ele(CLASS_SPLIT_PREVIEW_EXCLUDES);
    const excl_value = parseInt(window_result_span.innerHTML);

    /*  
    If either value is 0, the goal is one <li> located in the non-0 <ul> and 
    the display text will show whatever the total quantity is for that JobItem ID.
    */
    if(incl_value === 0){
        process_docitem_split_N_and_0(ID_INCLUDES_UL, jobitem_id);
    }
    else if(excl_value === 0){
        process_docitem_split_N_and_0(ID_EXCLUDES_UL, jobitem_id);
    }

    /*
    If neither value is 0, the goal is one <li> in each of the two <ul>s, with 
    the description in each modified in accordance with the user's input.
    */
    else{
        const description = get_combined_docitem_text_from_jobitem_id(jobitem_id);
        process_docitem_split_N_and_N(ID_INCLUDES_UL, incl_value, jobitem_id, description);
        process_docitem_split_N_and_N(ID_EXCLUDES_UL, excl_value, jobitem_id, description);
    }

    // The items just changed, so show the "unsaved changes" warning; then close this panel.
    show_save_warning_ele();
    close_docitem_split_window();
}

// Split DocItem Activity: handle the <li> and <ul> update in cases where the split set one to quantity = 0.
function process_docitem_split_N_and_0(ul_id_with_0, jobitem_id){
    // 0 quantity = the 0-having <ul> should have no <li> for this JobItem.
    var src_ul = document.querySelector('#' + ul_id_with_0);
    const docitem_li = get_li_with_same_jiid(src_ul, jobitem_id);

    // If it's not empty, this is equivalent to clicking incl. or excl., so run that function.
    if(docitem_li != null){
        var dst_ul = get_dest_docitem_ul(src_ul);
        update_both_docitem_ul_for_toggle(dst_ul, src_ul, docitem_li);
    }
    // If it was empty, we can assume the other <ul> has the <li> and all is well.

    return;
}

// Split DocItem Activity: handle the <li> and <ul> update in cases where the split set non-0 for both.
function process_docitem_split_N_and_N(ul_id, new_quantity, jobitem_id, description){

    // Find the <ul> in question and try to find the <li> for this JobItem ID
    const target_ul = document.querySelector('#' + ul_id);
    const target_li = get_li_with_same_jiid(target_ul, jobitem_id);

    // Check if we found the <li> and prepare the new description.
    const have_li = target_li != null;
    let new_display_string = description.replace(QTY_RE, new_quantity);

    // If this <ul> already has an <li> for this JobItem, update the innerHTML to reflect the new quantity.
    if(have_li){
        let display_span = target_li.querySelector('.' + CLASS_DISPLAY_SPAN);
        display_span.innerHTML = display_span.innerHTML = new_display_string;
    }
    // If the <ul> lacks a <li> for this JobItem, create one.
    else {
        let new_li = create_docitem_li(jobitem_id, new_display_string, ul_id);
        target_ul.append(new_li);

        // It's possible that we just added a <li> to a previously empty <ul>, so remove the message of intentional emptiness if it's there.
        remove_none_li(target_ul);
    }
}

// Split DocItem Support: navigates the DOM to find the "result ele" containing the number chosen by the user
function get_docitem_split_window_result_ele(result_preview_class){
    let window_div = document.querySelector('.' + CLASS_SPLIT_WINDOW);
    return window_div.querySelector('.' + result_preview_class).querySelector('span');
}

// Split DocItem Activity: display ele. Create a new DocItem <li>
function create_docitem_li(jobitem_id, description, ul_id){
    const li = document.createElement('li');
    li.setAttribute('data-jiid', jobitem_id);

    const span = document.createElement('span');
    span.classList.add(CLASS_DISPLAY_SPAN);
    span.innerHTML = description;
    li.append(span);

    const button_container = document.createElement('div');
    button_container.classList.add('button-container');

    const split_btn = document.createElement('button');
    split_btn.classList.add(CLASS_SPLIT_BTN);
    split_btn.classList.add('button-primary-hollow');
    split_btn.innerHTML = STR_SPLIT_BTN;
    split_btn.addEventListener('click', (e) => {
        split_doc_item(e);
    });
    
    
    const toggle_btn = document.createElement('button');
    toggle_btn.classList.add(CLASS_TOGGLE_BTN);
    toggle_btn.classList.add('button-primary');

    if(ul_id == ID_INCLUDES_UL){
        toggle_btn.innerHTML = STR_EXCLUDES_BTN;
    }
    else if(ul_id == ID_EXCLUDES_UL){
        toggle_btn.innerHTML = STR_INCLUDES_BTN;
    }

    toggle_btn.addEventListener('click', (e) => {
        toggle_doc_item(e);
    });
    button_container.append(toggle_btn);
    button_container.append(split_btn);
    

    li.append(button_container);

    return li;

}



