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

    document.querySelector('#document_issue_btn').addEventListener('click', () => {
        issue_document();
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
    return;
}

function update_both_docitem_ul(dst_ul, src_ul, docitem_ele){
    //toggle_edit_btn(dst_ul, docitem_ele);
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




function save_document(){
    update_document_on_server(null);
}


function update_document_on_server(issue_date){
    let reference = document.querySelector('#id_doc_reference').value;
    let doc_type = DOC_CODE;

    let req_prod_date_ele = document.querySelector('#id_req_prod_date');
    if(req_prod_date_ele){
        var req_prod_date = req_prod_date_ele.value;
    }
    else {
        var req_prod_date = null;
    }

    let doc_id = DOC_ID;

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

    let dict = {};
    dict['reference'] = reference;
    dict['issue_date'] = issue_date;
    dict['req_prod_date'] = req_prod_date;
    dict['assigned_items'] = assigned_items;

    fetch(`${URL_DOCBUILDER}?type=${doc_type}&id=${doc_id}`, {
        method: 'POST',
        body: JSON.stringify(dict),
        headers: getDjangoCsrfHeaders(),
        credentials: 'include'
    })
    .then(response => response.json())
    .then(console.log(data))
    .catch(error => {
        console.log('Error: ', error)
    });




    /*
    reference = models.CharField(max_length=SYSTEM_NAME_LENGTH, blank=True)
    issue_date = models.DateField(null=True)
    doc_type = models.CharField(max_length=DOC_CODE_MAX_LENGTH, choices=DOCUMENT_TYPES, null=True)

    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='documents')
    invoice_to = models.ForeignKey(Address, on_delete=models.SET_NULL, null=True, blank=True, related_name='financial_documents')
    delivery_to = models.ForeignKey(Address, on_delete=models.SET_NULL, null=True, blank=True, related_name='delivery_documents')

    items = models.ManyToManyField(JobItem, related_name='on_documents', through='DocAssignment')
    */
}



