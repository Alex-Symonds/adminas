const ID_ADD_COMMENT_WITH_SETTINGS_BTN = 'id_add_job_comment_with_settings';
const DEFAULT_COMMENT_ID = '0';
const CLASS_COMMENT_EDIT_BTN = 'edit-comment';
const CLASS_COMMENT_DELETE_BTN = 'delete-comment-btn';
const CLASS_COMMENT_TODO_TOGGLE = 'todo-list-toggle';

const CLASS_COMMENT_CU_ELEMENT = 'job-comment-cu-container';
const ID_COMMENT_TEXTAREA = 'id_comment_contents';
const ID_COMMENT_CHECKBOX_PRIVATE = 'id_private_checkbox';
const ID_COMMENT_CHECKBOX_TODO = 'id_todo_checkbox';

const CLASS_INDIVIDUAL_COMMENT_CONTAINER = 'one-comment';
const CLASS_COMMENT_MAIN = 'main';
const CLASS_COMMENT_CONTENTS = 'contents';
const CLASS_COMMENT_CONTROLS = 'controls';
const CLASS_COMMENT_FOOTER = 'footer';

const CLASS_TODO_BTN_ON = 'todo-status-on';
const CLASS_TODO_BTN_OFF = 'todo-status-off';
const CLASS_PRIVACY_STATUS = 'privacy-status';

const CLASS_ACCESS_DENIED = 'access-denied';

// Assign event listeners on load
document.addEventListener('DOMContentLoaded', () => {

    document.getElementById(ID_ADD_COMMENT_WITH_SETTINGS_BTN).addEventListener('click', ()=>{
        open_create_job_comment_form_with_settings(DEFAULT_COMMENT_ID);
    });

    document.querySelectorAll('.' + CLASS_COMMENT_EDIT_BTN).forEach(btn => {
        btn.addEventListener('click', (e) => {
            open_edit_job_comment(e.target);
        })
    });

    document.querySelectorAll('.' + CLASS_COMMENT_TODO_TOGGLE).forEach(btn => {
        btn.addEventListener('click', (e) => {
            toggle_todo_status(e.target);
        });
    });

});







// --------------------------------------------------------------------------------------------
// Open Create/Update Mode
// --------------------------------------------------------------------------------------------
// Open Create Mode: called onclick
function open_create_job_comment_form_with_settings(comment_id){
    // The "form" uses IDs, so close the old before opening the new.
    close_create_job_comment_form_with_settings();

    // Proceed with opening the new
    let job_comment_form = create_job_comment_form_with_settings(comment_id);
    let anchor_ele = document.getElementById(ID_ADD_COMMENT_WITH_SETTINGS_BTN);
    anchor_ele.after(job_comment_form);

    // Attempt to discourage multiple forms via hiding the buttons
    visibility_add_comment_btn(false);
    hide_all_by_class(CLASS_COMMENT_EDIT_BTN);
}

// Open Create Mode (also used for Update): all-in-one function to create a "form" for a Job comment, including the checkboxes for private and todo display
function create_job_comment_form_with_settings(comment_id){
    let container = document.createElement('div');
    container.classList.add(CLASS_COMMENT_CU_ELEMENT);

    let h = document.createElement('h4');
    if(comment_id == DEFAULT_COMMENT_ID){
        h.innerHTML = 'Add Comment';
    } else {
        h.innerHTML = 'Editing';
    }
    container.append(h);

    let main_input = document.createElement('textarea');
    main_input.name = 'contents';
    main_input.id = ID_COMMENT_TEXTAREA;
    main_input.cols = 30;
    main_input.rows = 5;
    container.append(main_input);

    let private_label = document.createElement('label');
    private_label.innerHTML = 'Private';
    private_label.for = ID_COMMENT_CHECKBOX_PRIVATE;
    container.append(private_label);

    let private_checkbox = document.createElement('input');
    private_checkbox.type = 'checkbox';
    private_checkbox.id = ID_COMMENT_CHECKBOX_PRIVATE;
    private_checkbox.checked = true;
    container.append(private_checkbox);

    let todo_label = document.createElement('label');
    todo_label.innerHTML = 'To-do list';
    todo_label.for = ID_COMMENT_CHECKBOX_TODO;
    container.append(todo_label);

    let todo_checkbox = document.createElement('input');
    todo_checkbox.type = 'checkbox';
    todo_checkbox.id = ID_COMMENT_CHECKBOX_TODO;
    container.append(todo_checkbox);

    let save_btn = document.createElement('button');
    save_btn.innerHTML = 'save';
    save_btn.setAttribute('data-comment_id', comment_id);
    save_btn.addEventListener('click', (e) => {
        save_job_comment_with_settings(e.target);
    });
    container.append(save_btn);

    if(comment_id != DEFAULT_COMMENT_ID){
        let delete_btn = document.createElement('button');
        delete_btn.classList.add(CLASS_COMMENT_DELETE_BTN);
        delete_btn.innerHTML = 'delete';
        delete_btn.addEventListener('click', (e) => {
            delete_job_comment(e.target);
        });
        container.append(delete_btn); 
    } 

    let close_btn = document.createElement('button');
    close_btn.innerHTML = 'cancel';
    close_btn.addEventListener('click', () => {
        close_create_job_comment_form_with_settings();
    });
    container.append(close_btn);

    return container;
}


// Cancel Create/Update Mode: called onclick of the "cancel" button located in the JobComment "form"
function close_create_job_comment_form_with_settings(){
    let ele = document.querySelector('.' + CLASS_COMMENT_CU_ELEMENT);
    if(ele == null){
        // It's not open, so there's nothing to close
        return;
    }

    // Attempt to use ele to set the comment_ele prior to removal
    let comment_ele = ele.closest('.' + CLASS_INDIVIDUAL_COMMENT_CONTAINER);
    ele.remove();

    // Create: there is no "closest" individual comment div, so the assignment above will fail and we skip this part.
    // Update: the form is inside a comment div, so the assignment will have succeeded. This also means the "read" parts
    // of the comment div will have been hidden during editing, so unhide them now.
    if(comment_ele != null){
        visibility_edit_mode(comment_ele, true);
    }

    // Create and Update: restore visibility to the "form" opening buttons
    visibility_add_comment_btn(true);
    unhide_all_by_class(CLASS_COMMENT_EDIT_BTN);
    return;
}


// Open Edit Mode: called onclick of an edit button
function open_edit_job_comment(btn){
    let comment_container = btn.closest('.' + CLASS_INDIVIDUAL_COMMENT_CONTAINER);
    let edit_mode_ele = edit_job_comment_form_with_settings(comment_container);
    comment_container.prepend(edit_mode_ele);
    visibility_edit_mode(comment_container, false);
}

// Open Edit Mode: borrow the function from "create" mode to get the "form", but this time populate it with the existing comment's contents and settings
function edit_job_comment_form_with_settings(comment_container){
    let comment_id = comment_container.dataset.comment_id;
    let base_element = create_job_comment_form_with_settings(comment_id);

    // Populate the "form" with the existing information for this comment
    // Contents default = empty, so fill it with the old comment
    let old_contents = comment_container.querySelector('.' + CLASS_COMMENT_CONTENTS).querySelector('p').innerHTML;
    base_element.querySelector('#' + ID_COMMENT_TEXTAREA).value = old_contents;

    // Private status default == true
    let old_private_status = comment_container.dataset.is_private;
    if(old_private_status.toLowerCase() == 'false'){
        base_element.querySelector('#' + ID_COMMENT_CHECKBOX_PRIVATE).checked = false;
    }

    // Todo status default == false
    let old_todo_status = comment_container.dataset.on_todo;
    if(old_todo_status.toLowerCase() == 'true'){
        base_element.querySelector('#' + ID_COMMENT_CHECKBOX_TODO).checked = true;
    }

    return base_element;
}

// Open Edit Mode: hide/show the "read" portions of the comments as required
function visibility_edit_mode(comment_ele, want_visibility){
    visibility_element(comment_ele.querySelector('.' + CLASS_COMMENT_MAIN), want_visibility);
    visibility_element(comment_ele.querySelector('.' + CLASS_COMMENT_FOOTER), want_visibility);
    return;
}

// Open Create/Edit Mode: hide/show the add comment button
function visibility_add_comment_btn(want_visibility){
    visibility_element(document.getElementById(ID_ADD_COMMENT_WITH_SETTINGS_BTN), want_visibility);
}

















// --------------------------------------------------------------------------------------------
// Backend (Create, Update)
// --------------------------------------------------------------------------------------------
// Backend (Create, Update): called onclick of the "save" button on the JobComment "form"
// Sends data to the backend then calls the appropriate page update function.
async function save_job_comment_with_settings(btn){
    let comment_id = btn.dataset.comment_id;
    let response = await save_job_comment(btn);

    // Case: "new comment". Add a new comment div to the list
    if(comment_id == '0'){
        update_job_page_comments_after_create(response);
    }
    // Case: "smart-arse tried to edit someone else's comment". Add a chastising message to the page
    else if('denied' in response){
        update_job_page_comments_after_denied(response['denied'], btn.closest('.' + CLASS_INDIVIDUAL_COMMENT_CONTAINER));
    }
    // Case: "update comment". Adjust the existing div
    else {
        update_job_page_comments_after_update(response, btn.closest('.' + CLASS_INDIVIDUAL_COMMENT_CONTAINER));
    } 
}

// Backend (Create, Update): prepare the data and send it off to the server
async function save_job_comment(btn){
    // This function will be called in two situations:
    //  1) From the Job page, where there are checkboxes to flag a comment for privacy and todo list visibility
    //  2) From the to-do list, where it's a more compact display and has no checkboxes.
    // If there's a checkbox, use the value the user has set; if not, default to true for both.
    // This default is based on the assumptions that: adding a comment from the todo list implies the user wants it displayed on the todo list;
    // todo list comments are intended to serve as reminders for the user, so more often than not won't be of public interest anyway;
    // private = true is a safer default than the alternative.

    let contents = document.getElementById('id_comment_contents').value;

    let want_private = true;
    let private_checkbox = document.getElementById('id_private_checkbox');
    if(private_checkbox != null){
        want_private = private_checkbox.checked;
    }

    let want_todo = true;
    let todo_checkbox = document.getElementById('id_todo_checkbox');
    if(todo_checkbox != null){
        want_todo = todo_checkbox.checked;
    }

    let response = await fetch(`${URL_JOB_COMMENTS}?id=${btn.dataset.comment_id}`, {
        method: 'POST',
        body: JSON.stringify({
            'contents': contents,
            'private': want_private,
            'todo_bool': want_todo
        }),
        headers: getDjangoCsrfHeaders(),
        credentials: 'include'
    })
    .catch(error => {
        console.log('Error: ', error);
    });

    return await response.json();
}

// --------------------------------------------------------------------------------------------
// Backend (Delete)
// --------------------------------------------------------------------------------------------
// Backend (Delete): called onclick
async function delete_job_comment(btn){
    let comment_container = btn.closest('.' + CLASS_INDIVIDUAL_COMMENT_CONTAINER);
    let response = await delete_job_comment_on_server(comment_container.dataset.comment_id);
    if('denied' in response){
        update_job_page_comments_after_denied(response['denied'], comment_container);
    } else {
        update_job_page_comments_after_delete(comment_container);
    }
}

// Send the data off, then return the response
async function delete_job_comment_on_server(comment_id){
    let response = await fetch(`${URL_JOB_COMMENTS}?id=${comment_id}`, {
        method: 'POST',
        body: JSON.stringify({
            'task': 'delete'
        }),
        headers: getDjangoCsrfHeaders(),
        credentials: 'include'
    })
    .catch(error => {
        console.log('Error: ', error);
    })

    return await response.json();
}



















// --------------------------------------------------------------------------------------------
// DOM following JobComment Create
// --------------------------------------------------------------------------------------------
// DOM Create: main "create mode" DOM update
function update_job_page_comments_after_create(response){   
    close_create_job_comment_form_with_settings();
    let new_comment_div = get_new_comment_div_full(response);
    //let anchor_ele = document.getElementById(ID_ADD_COMMENT_WITH_SETTINGS_BTN);
    let anchor_ele = document.querySelector('.' + CLASS_INDIVIDUAL_COMMENT_CONTAINER);
    anchor_ele.before(new_comment_div);
    remove_all_jobcomment_warnings();
}

// DOM Create: make a new comment storing div. Broken up into multiple functions.
function get_new_comment_div_full(response){
    let container_ele = document.createElement('div');
    container_ele.classList.add(CLASS_INDIVIDUAL_COMMENT_CONTAINER);
    container_ele.setAttribute('data-comment_id', response['id']);
    container_ele.setAttribute('data-is_private', response['private']);
    container_ele.setAttribute('data-on_todo', response['todo']);

    let upper_ele = document.createElement('div');
    upper_ele.classList.add(CLASS_COMMENT_MAIN);
    upper_ele.append(create_comment_body(response['contents']));
    upper_ele.append(create_comment_controls(response['todo']));

    container_ele.append(upper_ele);

    let lower_ele = document.createElement('div');
    lower_ele.classList.add(CLASS_COMMENT_FOOTER);
    lower_ele.append(create_comment_ownership(response['username'], response['timestamp'], response['private']));
    container_ele.append(lower_ele);

    return container_ele;
}

// DOM Create: JobComment div with the comment itself inside
function create_comment_body(contents){
    let contents_ele = document.createElement('div');
    contents_ele.classList.add(CLASS_COMMENT_CONTENTS);
    let p = document.createElement('p');
    p.innerHTML = contents;
    contents_ele.append(p);

    return contents_ele;
}

// DOM Create: JobComment div with the todo and edit buttons inside
function create_comment_controls(is_on_todo_list){
    let controls_ele = document.createElement('div');
    controls_ele.classList.add(CLASS_COMMENT_CONTROLS);
    let todo_btn = document.createElement('button');
    todo_btn.classList.add(CLASS_COMMENT_TODO_TOGGLE);

    if(is_on_todo_list){
        todo_btn.classList.add(CLASS_TODO_BTN_ON);
    } else {
        todo_btn.classList.add(CLASS_TODO_BTN_OFF);
    }

    todo_btn.innerHTML = 'todo';
    todo_btn.addEventListener('click', (e) => {
        toggle_todo_status(e.target);
    });
    controls_ele.append(todo_btn);

    let edit_btn = document.createElement('button');
    edit_btn.classList.add(CLASS_COMMENT_EDIT_BTN);
    edit_btn.innerHTML = 'edit';
    edit_btn.addEventListener('click', (e) => {
        open_edit_job_comment(e.target);
    });
    controls_ele.append(edit_btn); 

    return controls_ele;
}

// DOM Create: JobComment div with the user, timestamp and privacy status inside
function create_comment_ownership(username, timestamp, is_private){
    let result = document.createElement('div');
    result.innerHTML = `${username} on ${timestamp}`;

    // Placeholder: this bit will probably change when I CSS stuff
    let privacy_icon = get_comment_privacy_status_ele(is_private);
    result.append(privacy_icon);

    return result;
}




// --------------------------------------------------------------------------------------------
// DOM following JobComment Update
// --------------------------------------------------------------------------------------------
// DOM (Update): called by the handler function
function update_job_page_comments_after_update(response, comment_container_ele){
    // Remove the edit form
    close_create_job_comment_form_with_settings();

    // Update comment_container_ele attributes according to response
    comment_container_ele.setAttribute('data-is_private', response['private']);
    comment_container_ele.setAttribute('data-on_todo', response['todo']);
   
    // Update where the comment contents are displayed
    let contents_ele = comment_container_ele.querySelector('.' + CLASS_COMMENT_CONTENTS).querySelector('p');
    contents_ele.innerHTML = response['contents'];

    // Update where the todo status is displayed (currently a button with a class toggle)
    let todo_btn = comment_container_ele.querySelector('.' + CLASS_COMMENT_TODO_TOGGLE);
    update_comment_todo_btn(todo_btn, response['todo']);

    // Update where private/public status is displayed
    // Note: I'd prefer to only update the DOM if this /needs/ to change, but the placeholder version doesn't /really/ support that.
    // If later on there ends up being a telling CSS class or something, add something smarter. :)
    let privacy_ele = comment_container_ele.querySelector('.' + CLASS_PRIVACY_STATUS);
    privacy_ele.before(get_comment_privacy_status_ele(response['private']));
    privacy_ele.remove();
}

// DOM Update / DOM Todo Toggle: update the todo button
function update_comment_todo_btn(todo_btn, want_on){
    let is_on = todo_btn.classList.contains(CLASS_TODO_BTN_ON);
    if(is_on && !want_on){
        todo_btn.classList.remove(CLASS_TODO_BTN_ON);
        todo_btn.classList.add(CLASS_TODO_BTN_OFF);
    }
    else if(!is_on && want_on){
        todo_btn.classList.add(CLASS_TODO_BTN_ON);
        todo_btn.classList.remove(CLASS_TODO_BTN_OFF);        
    }    
}



// DOM Update/Create: get privacy status element
function get_comment_privacy_status_ele(is_private){
    // PLACEHOLDER: this will probably change when the CSS is setup.
    let result = document.createElement('span');
    result.classList.add(CLASS_PRIVACY_STATUS);

    if(is_private){
        result.innerHTML = '[PRIVATE_ICON]';
    }
    else{
        result.innerHTML += '[public_icon]';
    }

    return result;
}


// --------------------------------------------------------------------------------------------
// DOM following JobComment Denied
// --------------------------------------------------------------------------------------------
// DOM Denied: called by handler function
function update_job_page_comments_after_denied(response_str, comment_container_ele){
    close_create_job_comment_form_with_settings();

    let contents_ele = comment_container_ele.querySelector('.contents');
    let access_denied_ele = get_access_denied_ele(response_str);
    contents_ele.prepend(access_denied_ele);
}

// DOM Denied: create the message element
function get_access_denied_ele(response_str){
    let result = document.createElement('p');
    result.classList.add(CLASS_ACCESS_DENIED);
    result.innerHTML = response_str;
    return result;
}


// --------------------------------------------------------------------------------------------
// DOM following JobComment Delete
// --------------------------------------------------------------------------------------------
function update_job_page_comments_after_delete(comment_container){
    comment_container.remove();
}



// --------------------------------------------------------------------------------------------
// JobComment Utils
// --------------------------------------------------------------------------------------------
// JobComment utils: remove any warnings
function remove_all_jobcomment_warnings(){
    document.querySelectorAll('.' + CLASS_ACCESS_DENIED).forEach(ele => {
        ele.remove();
    });
}

// JobComment utils: hide/show an element via a CSS class as required
function visibility_element(element, want_visibility){
    let have_visibility = !element.classList.contains('hide');

    if(want_visibility && !have_visibility){
        element.classList.remove('hide');
    }
    else if(!want_visibility && have_visibility){
        element.classList.add('hide');
    }
    return;
}











// --------------------------------------------------------------------------------------------
// Todo List Toggle
// --------------------------------------------------------------------------------------------

function toggle_todo_status(btn){
    let comment_container_div = btn.closest('.' + CLASS_INDIVIDUAL_COMMENT_CONTAINER);

    if(comment_container_div == null){
        return;
    }

    let previous_todo = comment_container_div.dataset.on_todo == 'true';
    let comment_id = comment_container_div.dataset.comment_id;

    update_todo_on_server(comment_id, !previous_todo);
    update_todo_on_page(comment_container_div, !previous_todo);
}

function update_todo_on_server(comment_id, new_todo_status){
    fetch(`${URL_TODO_MANAGEMENT_COMMENTS}?id=${comment_id}`, {
        method: 'POST',
        body: JSON.stringify({
            'task': 'toggle',
            'toggle_to': new_todo_status
        }),
        headers: getDjangoCsrfHeaders(),
        credentials: 'include'
    })
}

function update_todo_on_page(comment_container_div, new_todo_status){
    comment_container_div.setAttribute('data-on_todo', new_todo_status);
    let todo_btn = comment_container_div.querySelector('.' + CLASS_COMMENT_TODO_TOGGLE);
    update_comment_todo_btn(todo_btn, new_todo_status);
}