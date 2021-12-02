const ID_INCLUDES_UL = 'included';
const ID_EXCLUDES_UL = 'excluded';
const CLASS_NONE_LI = 'none';
const CLASS_SPLIT_BTN = 'split-docitem-btn';
const CLASS_TOGGLE_BTN = 'toggle-docitem-btn';
const CLASS_DISPLAY_SPAN = 'display';
const CLASS_SPLIT_WINDOW = 'split-docitem-window';
const ID_SPLIT_WINDOW_INCLUDES_ARROWS = 'id_split_includes_arrows';
const ID_SPLIT_WINDOW_EXCLUDES_ARROWS = 'id_split_excludes_arrows';
const ID_SPLIT_WINDOW_DIRECTION = 'id_split_controls';


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

// Toggle docitems: main function, called on click of the include or exclude button
function toggle_doc_item(e){
    const docitem_ele = e.target.closest('li');
    const src_ul = docitem_ele.parentElement;
    const dst_ul = get_dest_docitem_ul(src_ul);
    if(dst_ul == null){
        return;
    }
    update_both_docitem_ul(dst_ul, src_ul, docitem_ele);
    show_save_warning_ele();
    return;
}

function update_both_docitem_ul(dst_ul, src_ul, docitem_ele){
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
    // If there's already a li for this item in the destination ul, the "move" will consist of
    // updating the quantity displayed in the destination li and deleting the source li
    const dst_li = get_li_with_same_jiid(dst_ul, src_li.dataset.jiid);
    if(dst_li != null){
        merge_into_dst_docitem_li(src_li, dst_li);

    } else {
        toggle_btn_str = get_toggle_display_str(dst_ul);
        src_li.querySelector('.' + CLASS_TOGGLE_BTN).innerHTML = toggle_btn_str;
        dst_ul.append(src_li);
    }
    return;
}

function get_toggle_display_str(dst_ul){
    let display_str = 'toggle';

    if(dst_ul.id === ID_EXCLUDES_UL){
        display_str = '&laquo; incl.';
    }
    else if(dst_ul.id === ID_INCLUDES_UL){
        display_str = 'excl. &raquo;'
    }

    return display_str;
}



// Toggle docitems: handle the "none" li
function update_none_li(src_ul, dst_ul){
    // An otherwise empty ul should show one li for "None".
    // Add it to src if src is now empty; remove it from dst if dst is no longer empty.
    remove_none_li(dst_ul);
    if(!ul_contains_li(src_ul)){
        src_ul.append(get_none_li());
    }
}

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

// Toggle docitems: create a "none" li
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
    // Add other stuff that happens here. Probably CSSy stuff.
    src_li.remove();
    return;
}

// Toggle docitems: combine "1 x Item" and "3 x Item" into "4 x Item"
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
    let jobitem_id = e.target.closest('li').dataset.jiid;
    let max_quantity = get_total_qty(jobitem_id);

    if(max_quantity == 1){
        // If there's only 1 in total, the only valid edit is setting the qty to 0, which is equivalent to toggling it. Skip to the end.
        toggle_doc_item(e);

    } else if (max_quantity > 1){
        open_docitem_split_window(e.target);

    } else {
        // Something's gone wrong. Do nothing.
        return;
    }
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

// Split DocItem Window: Create the window
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

// Split DocItem Window: component, heading
function create_ele_docitem_split_heading(){
    let ele = document.createElement('div');
    ele.classList.add(CSS_GENERIC_PANEL_HEADING);
    let heading = document.createElement('h5');
    heading.innerHTML = 'Edit Split';
    ele.append(create_ele_docitem_split_cancel_btn());
    ele.append(heading);
    return ele;
}

// Split DocItem Window: component, intro paragraph
function create_ele_docitem_desc(jobitem_id){
    let desc = document.createElement('p');
    desc.innerHTML = 'Splitting ' + get_combined_docitem_text_from_jobitem_id(jobitem_id);
    return desc;
}

// Split DocItem Window: component, get the text describing the docitem and its total quantity
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

// Split DocItem Window: component, get the item display text from one <li>
function get_individual_docitem_text_from_jobitem_id(ul_id, jobitem_id){
    let ul = document.querySelector('#' + ul_id);
    let li = get_li_with_same_jiid(ul, jobitem_id);
    if(li != null){
        return li.querySelector('.' + CLASS_DISPLAY_SPAN).innerHTML;
    } else {
        return '';
    } 
}

// Split DocItem Window: component, the bit where you actually click and input things
function create_ele_docitem_split_controls(jobitem_id, calling_ul_id){
    const div = document.createElement('div');
    div.classList.add('split-direction-setter');
    div.append(create_ele_docitem_split_direction_div(calling_ul_id));

    let default_qty = get_docitem_qty(calling_ul_id, jobitem_id);
    const input_fld = create_ele_docitem_edit_field(default_qty);
    div.append(input_fld);

    return div;
}

// Split DocItem Window: component, the strip where you can set whether the number you input is for included or excluded
function create_ele_docitem_split_direction_div(called_from){
    const direction_div = document.createElement('div');
    direction_div.classList.add('split-direction-strip');

    const includes_div = document.createElement('div');
    const excludes_div = document.createElement('div');

    includes_div.id = ID_SPLIT_WINDOW_INCLUDES_ARROWS;
    excludes_div.id = ID_SPLIT_WINDOW_EXCLUDES_ARROWS;

    if(called_from === ID_INCLUDES_UL){
        includes_div.innerHTML = '&laquo;&laquo;&laquo;';
        excludes_div.innerHTML = '';
    }
    else if(called_from === ID_EXCLUDES_UL){
        includes_div.innerHTML = '';
        excludes_div.innerHTML = '&raquo;&raquo;&raquo;';
    }

    direction_div.append(includes_div);

    const middle_div = document.createElement('div');
    middle_div.id = ID_SPLIT_WINDOW_DIRECTION;
    middle_div.innerHTML = called_from;
    middle_div.addEventListener('click', (e) => {
        toggle_docitem_split_controls(e);
    });
    direction_div.append(middle_div);

    direction_div.append(excludes_div);
    return direction_div;
}

// Split DocItem Window: component, the input where you enter the quantity you want
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

// Split DocItem Window: component, the bit that previews the outcome of your split input
function create_ele_docitem_split_status_container(jobitem_id){
    let container = document.createElement('div');
    container.classList.add('docitem-split-status-container');
    container.append(create_ele_docitem_split_category_div(ID_INCLUDES_UL, jobitem_id));
    container.append(create_ele_docitem_split_category_div(ID_EXCLUDES_UL, jobitem_id));
    return container;
}

// Split DocItem Window: component, one "side" of the results preview
function create_ele_docitem_split_category_div(ul_id, jobitem_id){
    const div = document.createElement('div');
    div.classList.add(ul_id);
    div.classList.add('container');

    const heading = document.createElement('h5');
    heading.innerHTML = ul_id[0].toUpperCase() + ul_id.substring(1);
    div.append(heading);

    let default_qty = get_docitem_qty(ul_id, jobitem_id);
    let result_span = document.createElement('span');
    result_span.innerHTML = default_qty;
    div.append(result_span);

    return div;
}


// Split DocItem Window: component, the submit button
function create_ele_docitem_split_submit_btn(){
    let btn = create_generic_ele_submit_button();
    btn.classList.add('full-width-button');
    btn.innerHTML = 'split';
    btn.addEventListener('click', (e) => {
        process_split_request(e.target);
    });
    return btn;
}

// Split DocItem Window: component, the cancel button
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
    let controls_state = get_docitem_split_controls_state()
    let selected_id = controls_state;
    let other_id = toggle_docitem_membership_id(controls_state);

    let selected_ele = get_docitem_split_window_result_ele(selected_id);
    let other_ele = get_docitem_split_window_result_ele(other_id);
    let selected_qty = parseInt(input_fld.value);
    let total_qty = get_total_qty(input_fld.closest('li').dataset.jiid);
    set_docitem_split_window(selected_ele, other_ele, total_qty, selected_qty);
}

// Split DocItem Window: function, flips the __cludes class to the other
function toggle_docitem_membership_id(in_id){
    if(in_id == ID_INCLUDES_UL){
        return ID_EXCLUDES_UL;
    } else {
        return ID_INCLUDES_UL;
    }
}


function get_docitem_split_controls_state(){
    let split_controls_ele = document.querySelector('#id_split_controls');
    let display_text = split_controls_ele.innerHTML.toLowerCase();

    if(display_text.includes(ID_EXCLUDES_UL)){
        return ID_EXCLUDES_UL;
    }
    else if(display_text.includes(ID_INCLUDES_UL)){
        return ID_INCLUDES_UL;
    }
    return
}

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

function get_total_qty(jiid){
    let result = 0;

    let includes_qty = get_docitem_qty(ID_INCLUDES_UL, jiid);
    result += includes_qty;

    let excludes_qty = get_docitem_qty(ID_EXCLUDES_UL, jiid);
    result += excludes_qty;

    return result;
}

function get_docitem_qty(class_name, jiid){
    let ul = document.querySelector('#' + class_name);
    const docitem_ele = get_li_with_same_jiid(ul, jiid);
    if(docitem_ele != null){
        return parseInt(docitem_ele.querySelector('.display').innerHTML.match(QTY_RE)[0])
    }
    return 0;
}






function process_split_request(calling_ele){
    const docitem_li = calling_ele.closest('li');
    const jobitem_id = docitem_li.dataset.jiid;

    let window_result_span = get_docitem_split_window_result_ele(ID_INCLUDES_UL);
    const incl_value = parseInt(window_result_span.innerHTML);

    window_result_span = get_docitem_split_window_result_ele(ID_EXCLUDES_UL);
    const excl_value = parseInt(window_result_span.innerHTML);

    if(incl_value === 0){
        process_docitem_split_N_and_0(ID_INCLUDES_UL, jobitem_id);
    }
    else if(excl_value === 0){
        process_docitem_split_N_and_0(ID_EXCLUDES_UL, jobitem_id);
    }
    else{
        const description = get_combined_docitem_text_from_jobitem_id(jobitem_id);
        process_docitem_split_N_and_N(ID_INCLUDES_UL, incl_value, jobitem_id, description);
        process_docitem_split_N_and_N(ID_EXCLUDES_UL, excl_value, jobitem_id, description);
    }
    show_save_warning_ele();
    close_docitem_split_window();
}


function process_docitem_split_N_and_0(src_id, jobitem_id){
    // 0 quantity = one of the two uls should have no li for this JobItem. Check if that's already the case.
    // If so, assume everything's ok as-is and do nothing. If not, this is equivalent to a toggle, so run that.
    var src_ul = document.querySelector('#' + src_id);
    const docitem_li = get_li_with_same_jiid(src_ul, jobitem_id);
    if(docitem_li != null){
        var dst_ul = get_dest_docitem_ul(src_ul);
        update_both_docitem_ul(dst_ul, src_ul, docitem_li);
    }
}



function process_docitem_split_N_and_N(class_name, new_quantity, jobitem_id, description){
    const target_ul = document.querySelector('#' + class_name);
    const target_li = get_li_with_same_jiid(target_ul, jobitem_id);

    const have_li = target_li != null;

    if(have_li){
        let display_span = target_li.querySelector('.display');
        display_span.innerHTML = display_span.innerHTML.replace(QTY_RE, new_quantity);
    }
    else {
        let new_li = create_docitem_li(jobitem_id, description.replace(QTY_RE, new_quantity), class_name);
        target_ul.append(new_li);
        remove_none_li(target_ul);
    }
}

function get_docitem_split_window_result_ele(class_name){
    let window_div = document.querySelector('.' + CLASS_SPLIT_WINDOW);
    return window_div.querySelector('.' + class_name).querySelector('span');
}

function create_docitem_li(jobitem_id, description, class_name){
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
    split_btn.innerHTML = '&laquo; split &raquo;';
    split_btn.addEventListener('click', (e) => {
        split_doc_item(e);
    });
    button_container.append(split_btn);

    const toggle_btn = document.createElement('button');
    toggle_btn.classList.add(CLASS_TOGGLE_BTN);
    toggle_btn.classList.add('button-primary');

    if(class_name == ID_INCLUDES_UL){
        toggle_btn.innerHTML = 'excl. &raquo;';
    }
    else if(class_name == ID_INCLUDES_UL){
        toggle_btn.innerHTML = '&laquo; incl.';
    }

    toggle_btn.addEventListener('click', (e) => {
        toggle_doc_item(e);
    });
    button_container.append(toggle_btn);

    li.append(button_container);

    return li;

}



