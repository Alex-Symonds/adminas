const CLASS_SPECIAL_INSTRUCTION_EDIT = 'edit-special-instruction-btn';
const CLASS_SPECIAL_INSTRUCTION_DELETE = 'delete-special-instruction-btn';
const CLASS_LOCAL_NAV = 'status-controls';

const CLASS_INSTRUCTIONS_SECTION = 'special-instructions';

const CLASS_SHOW_ADD_INSTRUCTION_FORMLIKE = 'special-instruction';
const CLASS_HIDE_ADD_INSTRUCTION_FORMLIKE = 'close-new-instr';


document.addEventListener('DOMContentLoaded', () => {

    document.querySelector('#document_save_btn').addEventListener('click', () => {
        save_document();
    });

    document.querySelector('#document_issue_btn').addEventListener('click', (e) => {
        open_issue_document_window(e);
    });

    document.querySelector('#document_delete_btn').addEventListener('click', () => {
        delete_document();
    });


    document.querySelector('.' + CLASS_SHOW_ADD_INSTRUCTION_FORMLIKE).addEventListener('click', () => {
        unhide_all_by_class('add-new');
    });

    document.querySelector('.' + CLASS_HIDE_ADD_INSTRUCTION_FORMLIKE).addEventListener('click', () => {
        hide_all_by_class('add-new');
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

    let fields_container_ele = document.querySelector('.document-fields-container');
    if(fields_container_ele != null){
        document.querySelectorAll('input').forEach(input_ele => {
            input_ele.addEventListener('change', () => {
                show_save_warning_ele();
            })
        });
    }

});




function open_issue_document_window(e){
    let window = get_issue_document_window_element();
    e.target.after(window);
}


function get_issue_document_window_element(){
    let div = document.createElement('div');
    div.classList.add(CSS_GENERIC_PANEL);
    div.classList.add(CSS_GENERIC_FORM_LIKE);

    let cancel_btn = create_generic_ele_cancel_button();
    cancel_btn.addEventListener('click', (e) => {
        close_issue_document_window(e.target);
    });
    div.append(cancel_btn);

    let heading = document.createElement('h4');
    heading.classList.add(CSS_GENERIC_PANEL_HEADING);
    heading.innerHTML = 'Issue Date';
    div.append(heading);

    let input = document.createElement('input');
    input.classList.add('issue-date');
    input.type = 'date';
    const today = new Date();
    default_value = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    input.value = default_value;
    div.append(input);

    let issue_btn = create_generic_ele_submit_button();
    issue_btn.classList.add('full-width-button');
    issue_btn.innerHTML = 'issue';
    issue_btn.addEventListener('click', (e) => {
        issue_document(e.target);
    });
    div.append(issue_btn);



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
            display_document_response_message(data, document.querySelector('.status-controls'));
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


function get_special_instructions_as_list(){
    let special_instructions = [];
    let container_ele = document.querySelector('.' + CLASS_INSTRUCTIONS_SECTION);
    let parent_ele = container_ele.querySelector('.existing');

    Array.from(parent_ele.children).forEach(ele => {
        if(!ele.classList.contains('no-special-instructions')){
            let d = {}
            d['id'] = ele.dataset.siid;
            d['contents'] = ele.querySelector('.contents').innerHTML;
            special_instructions.push(d);
        }
    });
    return special_instructions;
}






function add_special_instruction_to_page(e){
    let section_div = document.querySelector('.special-instructions');
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
    main_div.classList.add('read_row');

    main_div.append(create_special_instructions_contents(display_str));

    let edit_btn = create_generic_ele_edit_button();
    edit_btn.setAttribute('data-siid', '0');
    edit_btn.addEventListener('click', (e) => {
        open_edit_mode_special_instruction(e.target);
    });
    main_div.append(edit_btn);
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
    let section_div = document.querySelector('.special-instructions');
    return section_div.querySelector('h3');
}


function open_edit_mode_special_instruction(btn){
    let target_div = btn.parentElement;
    let contents_div = target_div.querySelector('.contents');
    let old_str = contents_div.innerHTML;
    
    contents_div.classList.add('hide');
    hide_all_by_class('edit-icon');

    target_div.prepend(create_ele_edit_mode_special_instruction(old_str));
}

function create_ele_edit_mode_special_instruction(old_str){
    let edit_div = document.createElement('div');
    edit_div.classList.add('editing-special-instruction');
    edit_div.classList.add(CSS_GENERIC_PANEL);
    edit_div.classList.add(CSS_GENERIC_FORM_LIKE);

    let cancel_btn = create_generic_ele_cancel_button();
    cancel_btn.addEventListener('click', (e) => {
        close_edit_mode_special_instruction(e.target);
    });
    edit_div.append(cancel_btn);

    let heading = document.createElement('h5');
    heading.classList.add(CSS_GENERIC_PANEL_HEADING);
    heading.innerHTML = 'Edit Special Instruction';
    edit_div.append(heading);

    let input = document.createElement('textarea');
    input.innerHTML = old_str;
    edit_div.append(input);
    edit_div.append(create_ele_edit_mode_special_instruction_button_container());

    return edit_div;
}

function create_ele_edit_mode_special_instruction_button_container(){
    let button_container = document.createElement('div');
    button_container.classList.add('controls');

    let ok_btn = create_generic_ele_submit_button();
    ok_btn.innerHTML = 'change';
    ok_btn.addEventListener('click', (e) => {
        update_special_instructions_contents(e.target);
    });
    button_container.append(ok_btn);

    let del_btn = create_generic_ele_delete_button();
    del_btn.setAttribute('data-siid', '0');
    del_btn.addEventListener('click', (e) => {
        delete_special_instruction(e.target);
    }); 
    button_container.append(del_btn);

    return button_container;
}


function close_edit_mode_special_instruction(btn){
    let edit_div = btn.closest('.editing-special-instruction');
    let target_div = edit_div.parentElement;

    edit_div.remove();
    let contents_div = target_div.querySelector('.contents');
    contents_div.classList.remove('hide');
    unhide_all_by_class('edit-icon');
}

function update_special_instructions_contents(btn){
    let edit_ele = btn.closest('.editing-special-instruction');
    let input_ele = edit_ele.querySelector('textarea');
    let new_str = input_ele.value;

    let special_inst_ele = btn.closest('.read_row');
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
    let section_div = document.querySelector('.special-instructions');
    let none_p = section_div.querySelector('.no-special-instructions');

    let want_none_p = section_div.querySelector('.read_row') == null;
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
    div.innerHTML = 'warning: unsaved changes exist';
    return div;
}


function show_save_warning_ele(){
    let existing_unsaved_ele = document.querySelector('.unsaved-changes');

    if(existing_unsaved_ele == null){
        let anchor_ele = document.querySelector('.status-controls');
        let new_unsaved_ele = create_unsaved_changes_ele();
        anchor_ele.append(new_unsaved_ele);
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
