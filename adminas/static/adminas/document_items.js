const CLASS_INCLUDES_UL = 'included';
const CLASS_EXCLUDES_UL = 'excluded';
const CLASS_NONE_LI = 'none';
const CLASS_SPLIT_BTN = 'split-docitem-btn';
const CLASS_TOGGLE_BTN = 'toggle-docitem-btn';
const CLASS_DISPLAY_SPAN = 'display';
const CLASS_SPLIT_WINDOW = 'split-docitem-window';
const ID_SPLIT_WINDOW_INCLUDES_ARROWS = 'id_split_includes_arrows';
const ID_SPLIT_WINDOW_EXCLUDES_ARROWS = 'id_split_excludes_arrows';
const ID_SPLIT_WINDOW_DIRECTION = 'id_split_controls';
const CLASS_SPECIAL_INSTRUCTION_EDIT = 'edit-special-instruction-btn';
const CLASS_SPECIAL_INSTRUCTION_DELETE = 'delete-special-instruction-btn';
const CLASS_LOCAL_NAV = 'status-controls';

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


    document.querySelector('#document_save_btn').addEventListener('click', () => {
        save_document();
    });

    document.querySelector('#document_issue_btn').addEventListener('click', (e) => {
        open_issue_document_window(e);
    });

    document.querySelector('#document_delete_btn').addEventListener('click', () => {
        delete_document();
    });


    document.querySelector('.add-special-instruction-btn').addEventListener('click', (e) => {
        add_special_instruction_to_page(e);
    });

    document.querySelectorAll('.' + CLASS_SPECIAL_INSTRUCTION_EDIT).forEach(btn => {
        btn.addEventListener('click', (e) => {
            open_edit_mode_special_instruction(e.target);
        })
    });

    document.querySelectorAll('.' + CLASS_SPECIAL_INSTRUCTION_DELETE).forEach(btn => {
        btn.addEventListener('click', (e) => {
            delete_special_instruction(e.target);
        })
    });

});




// -------------------------------------------------------------------
// Toggling doc items between "on this doc" and "not on this doc"
// -------------------------------------------------------------------

// Toggle docitems: main function, called on click of the [x] button
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
    if(src_ul.classList.contains(CLASS_INCLUDES_UL)){
        var dst_ul = document.querySelector('.' + CLASS_EXCLUDES_UL);
        
    } else if (src_ul.classList.contains(CLASS_EXCLUDES_UL)){
        var dst_ul = document.querySelector('.' + CLASS_INCLUDES_UL);

    } else {
        return null;
    }
    return dst_ul;
}


// This is a relic of my previous plan to only have edit buttons on the "included" ul
function toggle_edit_btn(dst_ul, src_li){
    if(dst_ul.classList.contains(CLASS_INCLUDES_UL)){
        const toggle_btn = src_li.querySelector('.' + CLASS_TOGGLE_BTN);
        toggle_btn.before(get_docitem_edit_btn());
        
    } else if (dst_ul.classList.contains(CLASS_EXCLUDES_UL)){
        src_li.querySelector('.' + CLASS_EDIT_BTN).remove();
    }
    return;
}
// This is a relic of my previous plan to only have edit buttons on the "included" ul
function get_docitem_edit_btn(){
    let btn = document.createElement('button');
    btn.classList.add(CLASS_EDIT_BTN);
    btn.innerHTML = 'edit';
    btn.addEventListener('click', (e) => {
        split_doc_item(e);
    });
    return btn;
}


// Toggle docitems: update the position/content of the docitem li
function move_docitem_li(dst_ul, src_li){
    // If there's already a li for this item in the destination ul, the "move" will consist of
    // updating the quantity displayed in the destination li and deleting the source li
    const dst_li = get_li_with_same_jiid(dst_ul, src_li.dataset.jiid);
    if(dst_li){
        merge_into_dst_docitem_li(src_li, dst_li);

    } else {
        dst_ul.append(src_li);
    }
    return;
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

function split_doc_item(e){
    let jobitem_id = e.target.parentElement.dataset.jiid;
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


function open_docitem_split_window(split_btn){
    close_docitem_split_window();

    const li_ele = split_btn.parentElement;
    const calling_ul_class = li_ele.parentElement.classList[0];
    li_ele.append(get_docitem_split_window(li_ele.dataset.jiid, calling_ul_class));
    hide_all_by_class(CLASS_SPLIT_BTN);
    hide_all_by_class(CLASS_TOGGLE_BTN);
}

function get_docitem_split_window(jobitem_id, calling_ul_class){
    let div = document.createElement('div');
    div.classList.add(CLASS_SPLIT_WINDOW);

    div.append(get_docitem_split_heading());
    div.append(get_docitem_desc(jobitem_id));
    div.append(get_docitem_split_controls(jobitem_id, calling_ul_class));
    div.append(get_docitem_container(jobitem_id));
    div.append(get_docitem_split_submit_btn());
    div.append(get_docitem_split_cancel_btn());
    return div;
}

function get_docitem_split_heading(){
    let heading = document.createElement('h4');
    heading.innerHTML = 'Edit Split';
    return heading;
}

function get_docitem_desc(jobitem_id){
    let desc = document.createElement('p');
    desc.innerHTML = 'Splitting ' + get_combined_docitem_text_from_jobitem_id(jobitem_id);
    return desc;
}

function get_combined_docitem_text_from_jobitem_id(jobitem_id){
    let inc_text = get_individual_docitem_text_from_jobitem_id(CLASS_INCLUDES_UL, jobitem_id);
    let exc_text = get_individual_docitem_text_from_jobitem_id(CLASS_EXCLUDES_UL, jobitem_id);

    if(inc_text == ''){
        return exc_text;
    } else if(exc_text == ''){
        return inc_text;
    } else {
        return get_combined_docitem_text(inc_text, exc_text);
    }
}

function get_individual_docitem_text_from_jobitem_id(class_name, jobitem_id){
    let ul = document.querySelector('.' + class_name);
    let li = get_li_with_same_jiid(ul, jobitem_id);
    if(li){
        return li.querySelector('.' + CLASS_DISPLAY_SPAN).innerHTML;
    } else {
        return '';
    } 
}

function get_docitem_split_controls(jobitem_id, calling_ul_class){
    const div = document.createElement('div');
    div.append(get_docitem_split_direction_div(calling_ul_class));

    let default_qty = get_docitem_qty(calling_ul_class, jobitem_id);
    const input_fld = get_docitem_edit_field(default_qty);
    div.append(input_fld);

    return div;
}


function get_docitem_split_direction_div(called_from){
    const direction_div = document.createElement('div');

    const includes_div = document.createElement('div');
    includes_div.id = ID_SPLIT_WINDOW_INCLUDES_ARROWS;
    if(called_from = CLASS_INCLUDES_UL){
        includes_div.innerHTML = '<<<';
    }
    direction_div.append(includes_div);

    const middle_div = document.createElement('div');
    middle_div.id = ID_SPLIT_WINDOW_DIRECTION;
    middle_div.innerHTML = called_from;
    middle_div.addEventListener('click', (e) => {
        toggle_docitem_split_controls(e);
    });
    direction_div.append(middle_div);

    const excludes_div = document.createElement('div');
    excludes_div.id = ID_SPLIT_WINDOW_EXCLUDES_ARROWS;
    if(called_from = CLASS_EXCLUDES_UL){
        excludes_div.innerHTML = '';
    }
    direction_div.append(excludes_div);

    return direction_div;
}

function toggle_docitem_split_controls(e){
    let original_class = e.target.innerHTML;
    let includes_div = document.querySelector('#' + ID_SPLIT_WINDOW_INCLUDES_ARROWS);
    let excludes_div = document.querySelector('#' + ID_SPLIT_WINDOW_EXCLUDES_ARROWS);
    let direction_div = document.querySelector('#' + ID_SPLIT_WINDOW_DIRECTION);

    if(original_class === CLASS_INCLUDES_UL){
        includes_div.innerHTML = '';
        excludes_div.innerHTML = '>>>';
        direction_div.innerHTML = CLASS_EXCLUDES_UL;

    } else if (original_class === CLASS_EXCLUDES_UL){
        includes_div.innerHTML = '<<<';
        excludes_div.innerHTML = '';
        direction_div.innerHTML = CLASS_INCLUDES_UL;
    }
}

function get_docitem_container(jobitem_id){
    let container = document.createElement('div');
    // Probably some CSS stuff here, to setup a flexbox.
    container.append(get_docitem_split_category_div(CLASS_INCLUDES_UL, jobitem_id));
    container.append(get_docitem_split_category_div(CLASS_EXCLUDES_UL, jobitem_id));
    return container;
}

function get_docitem_split_category_div(ul_class, jobitem_id){
    const div = document.createElement('div');
    const max_qty = 2;
    div.classList.add(ul_class + '-window');

    const heading = document.createElement('h5');
    heading.innerHTML = ul_class[0].toUpperCase() + ul_class.substring(1);
    div.append(heading);

    let default_qty = get_docitem_qty(ul_class, jobitem_id);
    let result_span = document.createElement('span');
    //result_span.classList.add();
    result_span.innerHTML = default_qty;
    div.append(result_span);

    return div;
}


function get_docitem_edit_field(){
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

function get_docitem_split_submit_btn(){
    let btn = document.createElement('button');
    btn.innerHTML = 'ok';
    btn.addEventListener('click', (e) => {
        process_split_request(e.target);
    });
    return btn;
}

function get_docitem_split_cancel_btn(){
    let btn = document.createElement('button');
    btn.innerHTML = 'cancel';
    btn.addEventListener('click', () => {
        close_docitem_split_window();
    });
    return btn;
}


function close_docitem_split_window(){
    let existing_window = document.querySelector('.' + CLASS_SPLIT_WINDOW);
    if(existing_window){
        existing_window.remove();
    }
    unhide_all_by_class(CLASS_SPLIT_BTN);
    unhide_all_by_class(CLASS_TOGGLE_BTN);
}



function update_split_window(input_fld){
    const suffix = '-window';
    let controls_state = get_docitem_split_controls_state()
    let selected_class = controls_state + suffix;
    let other_class = toggle_docitem_membership_class(controls_state) + suffix;

    let selected_ele = get_docitem_split_window_result_ele(selected_class);
    let other_ele = get_docitem_split_window_result_ele(other_class);
    let selected_qty = parseInt(input_fld.value);
    let total_qty = get_total_qty(input_fld.closest('li').dataset.jiid);
    set_docitem_split_window(selected_ele, other_ele, total_qty, selected_qty);
}

function toggle_docitem_membership_class(in_class){
    if(in_class == CLASS_INCLUDES_UL){
        return CLASS_EXCLUDES_UL;
    } else {
        return CLASS_INCLUDES_UL;
    }
}

function get_docitem_split_controls_state(){
    let split_controls_ele = document.querySelector('#id_split_controls');
    return split_controls_ele.innerHTML.toLowerCase();
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

    let includes_qty = get_docitem_qty(CLASS_INCLUDES_UL, jiid);
    result += includes_qty;

    let excludes_qty = get_docitem_qty(CLASS_EXCLUDES_UL, jiid);
    result += excludes_qty;

    return result;
}

function get_docitem_qty(class_name, jiid){
    let ul = document.querySelector('.' + class_name);
    const docitem_ele = get_li_with_same_jiid(ul, jiid);
    if(docitem_ele != null){
        return parseInt(docitem_ele.querySelector('.display').innerHTML.match(QTY_RE)[0])
    }
    return 0;
}






function process_split_request(calling_ele){
    const docitem_li = calling_ele.closest('li');
    const jobitem_id = docitem_li.dataset.jiid;

    let window_result_span = get_docitem_split_window_result_ele(CLASS_INCLUDES_UL + '-window');
    const incl_value = parseInt(window_result_span.innerHTML);

    window_result_span = get_docitem_split_window_result_ele(CLASS_EXCLUDES_UL + '-window');
    const excl_value = parseInt(window_result_span.innerHTML);

    if(incl_value === 0){
        process_docitem_split_N_and_0(CLASS_EXCLUDES_UL, jobitem_id);
    }
    else if(excl_value === 0){
        process_docitem_split_N_and_0(CLASS_INCLUDES_UL, jobitem_id);
    }
    else{
        const description = get_combined_docitem_text_from_jobitem_id(jobitem_id);
        process_docitem_split_N_and_N(CLASS_INCLUDES_UL, incl_value, jobitem_id, description);
        process_docitem_split_N_and_N(CLASS_EXCLUDES_UL, excl_value, jobitem_id, description);
    }
    show_save_warning_ele();
    close_docitem_split_window();
}


function process_docitem_split_N_and_0(src_class, jobitem_id){
    // 0 quantity = one of the two uls should have no li for this JobItem. Check if that's already the case.
    // If so, assume everything's ok as-is and do nothing. If not, this is equivalent to a toggle, so run that.
    var src_ul = document.querySelector('.' + src_class);
    const docitem_li = get_li_with_same_jiid(src_ul, jobitem_id);
    if(docitem_li != null){
        var dst_ul = get_dest_docitem_ul(src_ul);
        update_both_docitem_ul(dst_ul, src_ul, docitem_li);
    }
}



function process_docitem_split_N_and_N(class_name, new_quantity, jobitem_id, description){
    const target_ul = document.querySelector('.' + class_name);
    const target_li = get_li_with_same_jiid(target_ul, jobitem_id);

    const have_li = target_li != null;

    if(have_li){
        let display_span = target_li.querySelector('.display');
        display_span.innerHTML = display_span.innerHTML.replace(QTY_RE, new_quantity);
    }
    else {
        let new_li = create_docitem_li(jobitem_id, description.replace(QTY_RE, new_quantity));
        target_ul.append(new_li);
        remove_none_li(target_ul);
    }
}

function get_docitem_split_window_result_ele(class_name){
    let window_div = document.querySelector('.' + CLASS_SPLIT_WINDOW);
    return window_div.querySelector('.' + class_name).querySelector('span');
}

function create_docitem_li(jobitem_id, description){
    const li = document.createElement('li');
    li.setAttribute('data-jiid', jobitem_id);

    const span = document.createElement('span');
    span.classList.add(CLASS_DISPLAY_SPAN);
    span.innerHTML = description;
    li.append(span);

    const split_btn = document.createElement('button');
    split_btn.classList.add(CLASS_SPLIT_BTN);
    split_btn.innerHTML = 'split';
    split_btn.addEventListener('click', (e) => {
        split_doc_item(e);
    });
    li.append(split_btn);

    const toggle_btn = document.createElement('button');
    toggle_btn.classList.add(CLASS_TOGGLE_BTN);
    toggle_btn.innerHTML = 'x';
    toggle_btn.addEventListener('click', (e) => {
        toggle_doc_item(e);
    });
    li.append(toggle_btn);

    return li;

}



function open_issue_document_window(e){
    let window = get_issue_document_window_element();
    e.target.after(window);
}


function get_issue_document_window_element(){
    let div = document.createElement('div');

    let heading = document.createElement('h4');
    heading.innerHTML = 'Issue Date';
    div.append(heading);

    let input = document.createElement('input');
    const today = new Date();
    default_value = today.getDate() + '/' + (today.getMonth() + 1) + '/' + today.getFullYear();
    input.value = default_value;
    div.append(input);

    let issue_btn = document.createElement('button');
    issue_btn.innerHTML = 'issue';
    issue_btn.addEventListener('click', (e) => {
        issue_document(e.target);
    });
    div.append(issue_btn);

    let cancel_btn = document.createElement('button');
    cancel_btn.innerHTML = 'cancel';
    cancel_btn.addEventListener('click', (e) => {
        close_issue_document_window(e.target);
    });
    div.append(cancel_btn);

    return div;

}

function close_issue_document_window(btn){
    btn.parentElement.remove();
    return;
}







function issue_document(btn){
    let input = btn.parentElement.querySelector('input');
    let issue_date = input.value;
    update_document_on_server(issue_date);
}

function save_document(){
    update_document_on_server(null);
}

function update_document_on_server(issue_date){
    let dict = get_document_data_as_dict(issue_date);

    if(DOC_ID == '0'){
        var URL = `${URL_DOCBUILDER}?job=${JOB_ID}&type=${DOC_CODE}`;
    } else {
        var URL = `${URL_DOCBUILDER}?id=${DOC_ID}`
    }

    fetch(URL, {
        method: 'POST',
        body: JSON.stringify(dict),
        headers: getDjangoCsrfHeaders(),
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        if ('redirect' in data){
            window.location.href = data['redirect'];
        } else {
            display_document_response_message(data, document.querySelector('#docbuilder_actions_buttons_container'));
            remove_save_warning_ele();
        }
    })
    .catch(error => {
        console.log('Error: ', error)
    });
}






function get_document_data_as_dict(issue_date){
    let dict = {};
    dict['reference'] = document.querySelector('#id_doc_reference').value;
    dict['issue_date'] = issue_date;
    dict['assigned_items'] = get_assigned_items_as_list();
    dict['special_instructions'] = get_special_instructions_as_list();

    // Document-type-specific fields. Only one at present, so handle it here.
    let req_prod_date_ele = document.querySelector('#id_req_prod_date');
    if(req_prod_date_ele){
        var req_prod_date = req_prod_date_ele.value;
        if(req_prod_date == ''){
            dict['req_prod_date'] = '';
        }
        else {
            dict['req_prod_date'] = req_prod_date;
        }
    }

    return dict;
}

function get_assigned_items_as_list(){
    let assigned_items = [];
    let assigned_ul = document.querySelector('.' + CLASS_INCLUDES_UL);
    Array.from(assigned_ul.children).forEach(ele => {
        if(ele.tagName == 'LI'){
            let d = {}
            d['quantity'] = ele.querySelector('.display').innerHTML.match(QTY_RE)[0];
            d['id'] = ele.dataset.jiid;
            assigned_items.push(d);
        }
    });
    return assigned_items;
}

const CLASS_INSTRUCTIONS_SECTION = 'section-special-instructions-builder';

function get_special_instructions_as_list(){
    let special_instructions = [];
    let container_ele = document.querySelector('.' + CLASS_INSTRUCTIONS_SECTION);
    let parent_ele = container_ele.querySelector('.existing');

    Array.from(parent_ele.children).forEach(ele => {
        if(!ele.classList.contains('no_special_instructions')){
            let d = {}
            d['id'] = ele.dataset.siid;
            d['contents'] = ele.querySelector('.contents').innerHTML;
            special_instructions.push(d);
        }
    });
    return special_instructions;
}






function add_special_instruction_to_page(e){
    let section_div = document.querySelector('.section-special-instructions-builder');
    let input = section_div.querySelector('textarea');
    let new_instruction = input.value;
    input.value = '';

    let new_instruction_div = create_instructions_display_div(new_instruction);

    let destination_parent = document.querySelector('.existing');
    destination_parent.prepend(new_instruction_div);

    update_no_special_instructions_ele();
    show_save_warning_ele();
}



function create_instructions_display_div(display_str){
    let main_div = document.createElement('div');
    main_div.classList.add('one-special-instruction');

    main_div.append(create_special_instructions_contents(display_str));

    let edit_btn = document.createElement('button');
    edit_btn.classList.add(CLASS_SPECIAL_INSTRUCTION_EDIT);
    edit_btn.innerHTML = 'edit';
    edit_btn.setAttribute('data-siid', '0');
    edit_btn.addEventListener('click', (e) => {
        open_edit_mode_special_instruction(e.target);
    });
    main_div.append(edit_btn);

    let del_btn = document.createElement('button');
    del_btn.classList.add(CLASS_SPECIAL_INSTRUCTION_DELETE);
    del_btn.innerHTML = 'x';
    del_btn.setAttribute('data-siid', '0');
    del_btn.addEventListener('click', (e) => {
        delete_special_instruction(e.target);
    }); 
    main_div.append(del_btn);

    main_div.append(create_temporary_who_and_when_div());

    return main_div;
}

function create_temporary_who_and_when_div(){
    let info_div = document.createElement('div');
    info_div.classList.add('who-and-when');

    let username_span = document.createElement('span');
    username_span.classList.add('username');
    username_span.innerHTML = 'You';
    info_div.append(username_span);

    let text_on = document.createTextNode(' on ');
    info_div.append(text_on);

    let when_span = document.createElement('span');
    when_span.classList.add('when');
    when_span.innerHTML = get_date_time();
    info_div.append(when_span);

    return info_div;
}

function create_special_instructions_contents(display_str){
    let contents_div = document.createElement('div');
    contents_div.classList.add('contents');
    contents_div.innerHTML = display_str;
    return contents_div;
}



function find_special_instructions_heading(){
    let section_div = document.querySelector('.section-special-instructions-builder');
    return section_div.querySelector('h3');
}


function open_edit_mode_special_instruction(btn){
    let target_div = btn.parentElement;
    let contents_div = target_div.querySelector('.contents');
    let old_str = contents_div.innerHTML;
    
    contents_div.classList.add('hide');

    let edit_div = document.createElement('div');
    edit_div.classList.add('editing-special-instruction');

    let input = document.createElement('textarea');
    input.innerHTML = old_str;
    edit_div.append(input);

    let ok_btn = document.createElement('button');
    ok_btn.innerHTML = 'ok';
    ok_btn.addEventListener('click', (e) => {
        update_special_instructions_contents(e.target);
    });
    edit_div.append(ok_btn);

    let cancel_btn = document.createElement('button');
    cancel_btn.innerHTML = 'cancel';
    cancel_btn.addEventListener('click', (e) => {
        close_edit_mode_special_instruction(e.target);
    });
    edit_div.append(cancel_btn);

    target_div.prepend(edit_div);
}

function close_edit_mode_special_instruction(btn){
    let edit_div = btn.parentElement;
    let target_div = edit_div.parentElement;

    edit_div.remove();
    let contents_div = target_div.querySelector('.contents');
    contents_div.classList.remove('hide');
}

function update_special_instructions_contents(btn){
    let edit_ele = btn.parentElement;
    let input_ele = edit_ele.querySelector('textarea');
    let new_str = input_ele.value;

    let special_inst_ele = btn.closest('.one-special-instruction');
    let target_ele = special_inst_ele.querySelector('.contents');
    target_ele.innerHTML = new_str;
    target_ele.classList.remove('hide');
    close_edit_mode_special_instruction(btn);
    show_save_warning_ele();
}

function delete_special_instruction(btn){
    btn.parentElement.remove();
    update_no_special_instructions_ele();
    show_save_warning_ele();
}




function update_no_special_instructions_ele(){
    let section_div = document.querySelector('.section-special-instructions-builder');
    let none_p = section_div.querySelector('.no_special_instructions');

    let want_none_p = section_div.querySelector('.one-special-instruction') == null;
    let have_none_p = none_p != null;

    if(want_none_p && !have_none_p){
        let existing = document.querySelector('.existing');
        existing.append(create_no_special_instructions_ele()); 
    }
    else if(!want_none_p && have_none_p){
        none_p.remove();
    }
}

function create_no_special_instructions_ele(){
    let p = document.createElement('p');
    p.classList.add('no_special_instructions');
    p.innerHTML = "No special instructions on this document.";
    return p;
}


function create_unsaved_changes_ele(){
    let div = document.createElement('div');
    div.classList.add('unsaved-changes');
    div.innerHTML = 'Warning: unsaved changes exist';
    return div;
}


function show_save_warning_ele(){
    let existing_unsaved_ele = document.querySelector('.unsaved-changes');

    if(existing_unsaved_ele == null){
        let anchor_ele = document.querySelector('.document-fields-container');
        let new_unsaved_ele = create_unsaved_changes_ele();
        anchor_ele.before(new_unsaved_ele);
    }
}

function remove_save_warning_ele(){
    let existing_unsaved_ele = document.querySelector('.unsaved-changes');
    if(existing_unsaved_ele != null){
        existing_unsaved_ele.remove();
    }
}



function delete_document(){
    let delete_confirmed = confirm('Deleting a document cannot be undone except by a system administrator. Are you sure?');

    if(delete_confirmed){
        fetch(`${URL_DOCBUILDER}?id=${DOC_ID}`,{
            method: 'DELETE',
            headers: getDjangoCsrfHeaders(),
            credentials: 'include'         
        })
        .then(response => response.json())
        .then(data => {
            if ('redirect' in data){
                window.location.href = data['redirect'];
            } else {
                display_document_response_message(data);
            }
        })
        .catch(error => {
            console.log('Error: ', error)
        })
    }
}

// function update_local_nav(doc_id){
//     let local_nav_ele = document.querySelector('.' + CLASS_LOCAL_NAV);

//     let p = local_nav_ele.querySelector('p');
//     if(p == null){
//         return;
//     }

//     let exit_edit_link = document.createElement('a');
//     exit_edit_link.href = URL_DOCMAIN;
//     exit_edit_link.innerHTML = 'Exit edit mode';
//     p.after(exit_edit_link);

//     let preview_link = document.createElement('a');
//     preview_link.href = URL_PREVIEW.replace('0', doc_id);
//     preview_link.innerHTML = 'Preview';
//     exit_edit_link.after(preview_link);

//     preview_link.before(document.createElement('br'));
//     preview_link.after(document.createElement('br'));

//     p.remove();
// }