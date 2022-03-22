/*
    Job page PO handling.

    > Open "edit mode" on an existing PO via cloning the "add new PO" form and modifying it a bit
    > Delete a PO via the button on the form
*/


const ID_PO_EDIT_FORM = 'po_edit_form';
const CLASS_PO_EDIT_BTN = 'po-edit';

document.addEventListener('DOMContentLoaded', (e) => {
    document.querySelectorAll('.' + CLASS_PO_EDIT_BTN).forEach(btn => {
        btn.addEventListener('click', (e) => {
            open_po_editor(e);
        });
    });
});


// Edit PO: Display an "edit existing PO" form
function open_po_editor(e){
    // Grab existing edit form for existence check and usage
    let edit_po_form = document.querySelector('#' + ID_PO_EDIT_FORM);

    // Avoid wasting time if the user clicked the same edit button twice
    let next_ele = e.target.nextSibling;
    if(edit_po_form === next_ele){
        return;
    }

    // Either assign the existing form (but wipe it first) or clone a new edit form
    if(edit_po_form != null){
        wipe_data_from_form(edit_po_form);
        var form_div = edit_po_form;
    } else {
        var form_div = get_ele_edit_po_div(e.target);
    }

    // Add to DOM
    e.target.after(form_div);

    let button_container = form_div.querySelector('.controls');
    button_container.append(get_edit_po_delete_btn(e.target.dataset.po));

    populate_po_edit_form(form_div);
}

// Edit PO: Create an element for editing an existing PO
function get_ele_edit_po_div(edit_btn){
    let create_po_form = document.querySelector('#po_form');
    let div = create_po_form.cloneNode(true);

    div.id = ID_PO_EDIT_FORM;
    div.action = `${URL_PO}?id=${edit_btn.dataset.po}`;
    if(div.classList.contains('hide')){
        div.classList.remove('hide');
    }
    
    let heading = div.querySelector('h5');
    heading.classList.add(CSS_GENERIC_PANEL_HEADING);
    heading.innerHTML = "Edit PO";

    let cancel_btn = div.querySelector('.cancel-po-form');
    cancel_btn.addEventListener('click', close_edit_form);

    return div;
}

// Edit PO: Create a delete button for the PO editing form
function get_edit_po_delete_btn(po_id){
    let btn = create_generic_ele_delete_button();
    btn.id = 'delete_po_btn';

    btn.setAttribute('data-po', po_id);
    btn.addEventListener('click', (e) => {
        delete_po(e);
    });
    return btn;
}

// Edit PO: Find the edit PO form and close it.
function close_edit_form(){
    let form = document.querySelector('#' + ID_PO_EDIT_FORM);
    if(form != null){
        form.remove();
    }
}

// Edit PO: Enter the existing contents of the PO into the edit form
function populate_po_edit_form(edit_form){
    let po_row = edit_form.parentElement;
    po_row.querySelectorAll('span').forEach(span => {

        let field_name = span.classList[0];
        var form_field = edit_form.querySelector('#id_' + field_name);
        if(form_field != null){
            if(form_field.tagName === 'INPUT' && (form_field.type === 'number' || form_field.type === 'text')){

                if(field_name.includes('date')){
                    form_field.value = convert_display_date_to_input_date(span.innerHTML);

                }else if (form_field.type === 'number'){
                    form_field.value = span.innerHTML.replaceAll(',', '');

                } else {
                    form_field.value = span.innerHTML;
                }

            } else if(form_field.tagName === 'SELECT'){
                form_field.selectedIndex = Array.from(form_field.options).findIndex(option => option.text == span.innerHTML);
            }
        }
    });
}

// Edit PO: Convert "01 Feb 2021" to "01/02/2021" (Django's form validation doesn't recognise the former as a valid date, even though Django outputs it that way)
function convert_display_date_to_input_date(dd_mmm_yyyy){
    var months = {
        'Jan' : '01',
        'Feb' : '02',
        'Mar' : '03',
        'Apr' : '04',
        'May' : '05',
        'Jun' : '06',
        'Jul' : '07',
        'Aug' : '08',
        'Sep' : '09',
        'Oct' : '10',
        'Nov' : '11',
        'Dec' : '12'
    }
    let re = /(\s\w{3}\s)/g;
    let input_month = dd_mmm_yyyy.match(re)[0].replaceAll(' ', '');
    let month_num = months[input_month];
    return dd_mmm_yyyy.replace(re, '/' + month_num + '/');
}





// Delete PO: called by the delete button inside the PO form
function delete_po(e){
    delete_po_from_server(e.target.dataset.po);
}

// Delete PO: do the deletey deed
function delete_po_from_server(po_id){
    fetch(`${URL_PO}&id=${po_id}`, {
        method: 'DELETE',
        headers: getDjangoCsrfHeaders(),
        credentials: 'include'
    })
    .catch(error => {
        console.log('Error: ', error);
    });
}
