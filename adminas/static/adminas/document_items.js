const CLASS_INCLUDES_UL = 'included';
const CLASS_EXCLUDES_UL = 'excluded';
const CLASS_NONE_LI = 'none';
const CLASS_EDIT_BTN = 'edit-docitem-btn';
const CLASS_TOGGLE_BTN = 'toggle-docitem-btn';
const CLASS_DISPLAY_SPAN = 'display';

document.addEventListener('DOMContentLoaded', () => {

    document.querySelectorAll('.' + CLASS_TOGGLE_BTN).forEach(btn => {
        btn.addEventListener('click', (e) => {
            toggle_doc_item(e);
        })
    });

    document.querySelectorAll('.' + CLASS_EDIT_BTN).forEach(btn => {
        btn.addEventListener('click', (e) => {
            edit_doc_item(e);
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
    toggle_edit_btn(dst_ul, docitem_ele);
    move_docitem_li(dst_ul, docitem_ele);
    update_none_li(src_ul, dst_ul);
    return;
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


function toggle_edit_btn(dst_ul, src_li){
    if(dst_ul.classList.contains(CLASS_INCLUDES_UL)){
        const toggle_btn = src_li.querySelector('.' + CLASS_TOGGLE_BTN);
        toggle_btn.before(get_docitem_edit_btn());
        
    } else if (dst_ul.classList.contains(CLASS_EXCLUDES_UL)){
        src_li.querySelector('.' + CLASS_EDIT_BTN).remove();
    }
    return;
}

function get_docitem_edit_btn(){
    let btn = document.createElement('button');
    btn.classList.add(CLASS_EDIT_BTN);
    btn.innerHTML = 'edit';
    btn.addEventListener('click', (e) => {
        edit_doc_item(e);
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
    const none_li_dst = dst_ul.querySelector('.' + CLASS_NONE_LI);
    if(none_li_dst != null){
        none_li_dst.remove();
    }

    if(!ul_contains_li(src_ul)){
        src_ul.append(get_none_li());
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
function get_li_with_same_jiid(dst_ul, jiid){
    for(i = 0; i < dst_ul.children.length; i++){
        if(dst_ul.children[i].dataset.jiid){
            if(jiid == dst_ul.children[i].dataset.jiid){
                return dst_ul.children[i];
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
// Edit docitems
// ---------------------------------------------------------

function edit_doc_item(e){
    let jobitem_id = e.target.parentElement.dataset.jiid;
    let max_quantity = get_total_qty(jobitem_id);

    if(max_quantity == 1){
        // If there's only 1 in total, the only valid edit is setting the qty to 0, which is equivalent to toggling it. Skip to the end.
        toggle_doc_item(e);

    } else if (max_quantity > 1){
        enter_edit_mode(e.target);

    } else {
        // Something's gone wrong. Do nothing.
        return;
    }
}

function get_total_qty(jiid){
    let result = 0;

    let includes_ul = document.querySelector('.' + CLASS_INCLUDES_UL);
    let includes_qty = get_docitem_qty(includes_ul, jiid);
    if(includes_qty != null){
        result += includes_qty;
    }

    let excludes_ul = document.querySelector('.' + CLASS_EXCLUDES_UL);
    let excludes_qty = get_docitem_qty(excludes_ul, jiid);
    if(excludes_qty != null){
        result += excludes_qty;
    }
    return result;
}

function get_docitem_qty(ul_div, jiid){
    const docitem_ele = get_li_with_same_jiid(ul_div, jiid);
    if(docitem_ele != null){
        return parseInt(docitem_ele.innerHTML.match(QTY_RE)[0])
    }
    return null;
}


function enter_edit_mode(edit_btn){

    // Replace the qty with an input field
    const li_ele = edit_btn.parentElement;
    const display_span = li_ele.querySelector('.' + CLASS_DISPLAY_SPAN);
    const original_display_text = display_span.innerHTML;

    display_span.innerHTML = display_span.innerHTML.replace(QTY_RE, '');
    li_ele.prepend(get_docitem_edit_submit_btn());
    li_ele.prepend(get_qty_input_field(original_display_text));
    

    // Replace the qty text with an input field
    // Add a "go" button after the input field
    // Preserve the rest of the display text
}



function get_docitem_edit_field(filler_text){
    let fld = get_jobitem_qty_field();
    fld.value = filler_text.match(QTY_RE);

    fld.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            // whatever the edit does
        }
    });

    return fld;
}