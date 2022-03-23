/*
    "Main" Document Builder functionality, plus special instructions.
    (JobItem assignments are in a separate file)

    "Main" = 
        > Save document
        > Issue document
        > Delete document
        > "Unsaved changes" warning
        > Response message

    Special Instructions = 
        > Update on the page

    Note: Special instructions are only saved on the server as part of saving 
    the document as a whole, so there's no independent backend stuff for them.
*/


const CLASS_SPECIAL_INSTRUCTION_EDIT = 'edit-special-instruction-btn';
const CLASS_SPECIAL_INSTRUCTION_DELETE = 'delete-special-instruction-btn';
const CLASS_LOCAL_NAV = 'status-controls';

const CLASS_INSTRUCTIONS_SECTION = 'special-instructions';
const CLASS_ONE_SPECIAL_INSTRUCTION = 'read_row';

const CLASS_SHOW_ADD_INSTRUCTION_FORMLIKE = 'special-instruction';
const CLASS_HIDE_ADD_INSTRUCTION_FORMLIKE = 'close-new-instr';


document.addEventListener('DOMContentLoaded', () => {

    // Document-related buttons
    document.querySelector('#document_save_btn').addEventListener('click', () => {
        save_document();
    });

    document.querySelector('#document_issue_btn').addEventListener('click', (e) => {
        open_issue_document_window(e);
    });

    document.querySelector('#document_delete_btn').addEventListener('click', () => {
        delete_document();
    });

    let fields_container_ele = document.querySelector('.document-fields-container');
    if(fields_container_ele != null){
        document.querySelectorAll('input').forEach(input_ele => {
            input_ele.addEventListener('change', () => {
                show_save_warning_ele();
            })
        });
    }


    // Special instructions buttons
    const CLASS_ADD_NEW_SI = 'add-new';
    document.querySelector('.' + CLASS_SHOW_ADD_INSTRUCTION_FORMLIKE).addEventListener('click', () => {
        unhide_all_by_class(CLASS_ADD_NEW_SI);
    });
    document.querySelector('.' + CLASS_HIDE_ADD_INSTRUCTION_FORMLIKE).addEventListener('click', () => {
        hide_all_by_class(CLASS_ADD_NEW_SI);
    });

    document.querySelector('.add-special-instruction-btn').addEventListener('click', () => {
        add_special_instruction_to_page();
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





// Issue document: Starting point. Called on click of the issue button.
function open_issue_document_window(e){
    let window = get_issue_document_window_element();
    e.target.after(window);
}

// Issue document: create a panel allowing the user to pick an issue date before proceeding
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

// Issue document: close the panel without saving
function close_issue_document_window(btn){
    btn.parentElement.remove();
    return;
}


// Issue document: mid-point, called upon clicking the submit button in the issue panel.
// Grabs the "issue date" input value and passes it to the function sending it to the server
function issue_document(btn){
    let input = btn.parentElement.querySelector('input');
    let issue_date = input.value;
    update_document_on_server(issue_date);
}

// Save document: starting point, called upon clicking the "save draft" button
function save_document(){
    update_document_on_server(null);
}

// Issue and Save: shared function to send the status of the current draft to the server.
function update_document_on_server(issue_date){
    let dict = get_document_data_as_dict(issue_date);

    // DOC_ID 0 = creating a new document, so the server needs to know the Job ID and doc type
    if(DOC_ID == '0'){
        var URL = `${URL_DOCBUILDER}?job=${JOB_ID}&type=${DOC_CODE}`;
        var method = 'POST';

    // DOC_ID not 0 = updating an existing document, so the ID alone is sufficient
    } else {
        var URL = `${URL_DOCBUILDER}?id=${DOC_ID}`;
        var method = 'PUT';
    }

    fetch(URL, {
        method: method,
        body: JSON.stringify(dict),
        headers: getDjangoCsrfHeaders(),
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {

        // If the document was successfully issued, it can no longer be edited, so the server
        // will want to redirect the user back to the read-only document page.
        if ('redirect' in data){
            window.location.href = data['redirect'];

        // Otherwise the user can stay on this page and continue editing if they like. Get rid 
        // of the "unsaved changes" warning and notify the user about whatever just happened.
        } else {
            display_document_response_message(data, document.querySelector('.status-controls'));
            remove_save_warning_ele();
        }
    })
    .catch(error => {
        console.log('Error: ', error)
    });
}


// Issue and Save: shared function to grab all the inputs from the page and make a nice JSONable dict
function get_document_data_as_dict(issue_date){
    let dict = {};
    dict['reference'] = document.querySelector('#id_doc_reference').value;
    dict['issue_date'] = issue_date;
    dict['assigned_items'] = get_assigned_items_as_list();
    dict['special_instructions'] = get_special_instructions_as_list();

    // Document-type-specific fields. (There's only two at present, so handle it here instead of having a separate function)
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

    let sched_prod_date_ele = document.querySelector('#id_sched_prod_date');
    if(sched_prod_date_ele){
        var sched_prod_date = sched_prod_date_ele.value;
        if(sched_prod_date == ''){
            dict['sched_prod_date'] = '';
        }
        else {
            dict['sched_prod_date'] = sched_prod_date;
        }
    }

    return dict;
}

// Issue and Save: get a list of ID and quantity for every JobItem included on this document via the "includes" <ul>
function get_assigned_items_as_list(){
    let assigned_items = [];
    let assigned_ul = document.querySelector('#' + ID_INCLUDES_UL);

    if(null == assigned_ul.querySelector('.' + CLASS_NONE_LI)){
        Array.from(assigned_ul.children).forEach(ele => {
            if(ele.tagName == 'LI'){
                let d = {}
                d['quantity'] = ele.querySelector('.display').innerHTML.match(QTY_RE)[0];
                d['id'] = ele.dataset.jiid;
                assigned_items.push(d);
            }
        });
    }
    console.log(assigned_items.length);
    return assigned_items;
}

// Issue and Save: get a list of ID and contents for every SpecialInstruction on the document via the instructions section
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


// Delete Document: main function called by clicking the "delete" button.
// Display a warning window, then send the request to the server.
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

// Save Warning: if it doesn't already exist, display a message to warn the user of unsaved changes.
function show_save_warning_ele(){
    let existing_unsaved_ele = document.querySelector('.unsaved-changes');

    if(existing_unsaved_ele == null){
        let anchor_ele = document.querySelector('.status-controls');
        let new_unsaved_ele = create_unsaved_changes_ele();
        anchor_ele.append(new_unsaved_ele);
    }
}

// Save Warning: display ele. Create an element warning the user about unsaved changes.
function create_unsaved_changes_ele(){
    let div = document.createElement('div');
    div.classList.add('unsaved-changes');
    div.innerHTML = 'warning: unsaved changes exist';
    return div;
}

// Save Warning: remove the warning re. unsaved changes.
function remove_save_warning_ele(){
    let existing_unsaved_ele = document.querySelector('.unsaved-changes');
    if(existing_unsaved_ele != null){
        existing_unsaved_ele.remove();
    }
}





// Create Special Instructions: On clicking the "add to pending" button,
// update the frontend to show the presence of a new special instruction.
function add_special_instruction_to_page(){

    // Grab the contents of the new special instructions
    let section_div = document.querySelector('.special-instructions');
    let input = section_div.querySelector('textarea');
    let new_instruction = input.value;
    input.value = '';

    // Create an element for displaying it as a special instruction and add it to the page
    let new_instruction_div = create_instructions_display_div(new_instruction);
    let destination_parent = document.querySelector('.existing');
    destination_parent.prepend(new_instruction_div);

    // Update other affected stuff on the page
    update_no_special_instructions_ele();
    show_save_warning_ele();
}


// Create Special Instructions: display ele. Create an element to display one special instruction on the page
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

// Create Special Instructions: display ele component. Create a "who-and-when" element with placeholder "You on $DATE $TIME" text.
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

// Create Special Instructions: display ele component. Create the ele containing the actual content.
function create_special_instructions_contents(display_str){
    let contents_div = document.createElement('div');
    contents_div.classList.add('contents');
    contents_div.innerHTML = display_str;
    return contents_div;
}



// Update Special Instructions: main function, called on clicking the edit button.
function open_edit_mode_special_instruction(btn){

    // Hide the "old" contents and all the edit buttons (to reduce the chance of the user opening multiple edit panels)
    let target_div = btn.parentElement;
    let contents_div = target_div.querySelector('.contents');
    contents_div.classList.add('hide');
    hide_all_by_class('edit-icon');

    // Display the update panel with the old special instruction text pre-entered.
    let old_str = contents_div.innerHTML;
    target_div.prepend(create_ele_edit_mode_special_instruction(old_str));
}

// Update Special Instructions: display ele. Main function.
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

// Update Special Instructions: display ele component. Make a container for the change and delete buttons.
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

// Update Special Instructions: close without saving.
function close_edit_mode_special_instruction(btn){
    // Remove the edit form (taking care to use it to set the "target_element" first)
    let edit_ele = btn.closest('.editing-special-instruction');
    let target_ele = edit_ele.parentElement;
    edit_ele.remove();

    // Unhide the things we hid while editing
    let contents_div = target_ele.querySelector('.contents');
    contents_div.classList.remove('hide');
    unhide_all_by_class('edit-icon');
}

// Update Special Instructions: change the old special instruction ele to reflect user edits.
function update_special_instructions_contents(btn){
    // Get the new contents for the special instruction
    let edit_ele = btn.closest('.editing-special-instruction');
    let input_ele = edit_ele.querySelector('textarea');
    let new_str = input_ele.value;

    // Find the contents ele and replace the old contents with the new
    let special_inst_ele = btn.closest('.read_row');
    let target_ele = special_inst_ele.querySelector('.contents');
    target_ele.innerHTML = new_str;

    // Unhide the things we hid while editing and display the "unsaved changes" warning
    target_ele.classList.remove('hide');
    close_edit_mode_special_instruction(btn);
    show_save_warning_ele();
}



// Delete Special Instruction: remove one special instruction ele from the page.
function delete_special_instruction(btn){
    btn.closest('.' + CLASS_ONE_SPECIAL_INSTRUCTION).remove();
    update_no_special_instructions_ele();
    show_save_warning_ele();
}


// Create and Delete Special Instruction: when the Special Instructions section is empty, 
// it should display a message saying it's intentionally empty. When it stops being empty,
// the message should go away. This function manages that.
function update_no_special_instructions_ele(){
    let section_div = document.querySelector('.special-instructions');
    let none_p = section_div.querySelector('.no-special-instructions');

    let want_none_p = section_div.querySelector('.' + CLASS_ONE_SPECIAL_INSTRUCTION) == null;
    let have_none_p = none_p != null;

    if(want_none_p && !have_none_p){
        let existing = document.querySelector('.existing');
        existing.append(create_no_special_instructions_ele()); 
    }
    else if(!want_none_p && have_none_p){
        none_p.remove();
    }
}

// Delete Special Instruction: display ele. If the user deleted the last special instruction,
// we must create the message ele.
function create_no_special_instructions_ele(){
    let p = document.createElement('p');
    p.classList.add('no_special_instructions');
    p.innerHTML = "No special instructions on this document.";
    return p;
}






